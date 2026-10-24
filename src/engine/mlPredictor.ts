
import { spawn } from "node:child_process";
import path from "node:path";

export type ModelFeatureValue = string | number | null;

export type ModelFeatureRow = Record<
    string,
    ModelFeatureValue
>;

export interface MLPrediction {
    probability: number;
    target: string;
    dataset: string;
}

export class ModelPredictionError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode = 500) {
        super(message);
        this.name = "ModelPredictionError";
        this.statusCode = statusCode;
    }
}

export function predictDelayProbability(
    features: ModelFeatureRow
): Promise<MLPrediction> {
    return new Promise((resolve, reject) => {
        const projectRoot = process.cwd();

        const scriptPath = path.join(
            projectRoot,
            "ml",
            "predict_delay.py"
        );

        const pythonExecutable =
            process.env.PYTHON_EXECUTABLE ||
            (process.platform === "win32" ? "python" : "python3");

        const child = spawn(
            pythonExecutable,
            [
                scriptPath,
                "--features-json",
                JSON.stringify(features),
                "--json"
            ],
            {
                cwd: projectRoot,
                windowsHide: true
            }
        );

        let stdout = "";
        let stderr = "";
        let settled = false;

        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");

        child.stdout.on("data", (chunk: string) => {
            stdout += chunk;
        });

        child.stderr.on("data", (chunk: string) => {
            stderr += chunk;
        });

        child.on("error", error => {
            if (settled) {
                return;
            }

            settled = true;

            reject(
                new ModelPredictionError(
                    `Could not start the Python predictor: ${error.message}. ` +
                    "Activate your Python virtual environment or set PYTHON_EXECUTABLE."
                )
            );
        });

        child.on("close", code => {
            if (settled) {
                return;
            }

            settled = true;

            let result: {
                probability?: number;
                target?: string;
                dataset?: string;
                error?: string;
            };

            try {
                result = JSON.parse(stdout.trim());
            } catch {
                reject(
                    new ModelPredictionError(
                        "The Python predictor did not return valid JSON. " +
                        (stderr.trim() || stdout.trim() || "No output received.")
                    )
                );
                return;
            }

            if (
                code !== 0 ||
                typeof result.probability !== "number"
            ) {
                const message =
                    result.error ||
                    stderr.trim() ||
                    "The Python predictor failed.";

                const isInvalidFeatures =
                    message.startsWith(
                        "Missing required model features:"
                    ) ||
                    message.startsWith(
                        "Model features must be a JSON object."
                    );

                reject(
                    new ModelPredictionError(
                        message,
                        isInvalidFeatures ? 400 : 500
                    )
                );
                return;
            }

            if (
                !Number.isFinite(result.probability) ||
                result.probability < 0 ||
                result.probability > 1
            ) {
                reject(
                    new ModelPredictionError(
                        "The model returned an invalid probability."
                    )
                );
                return;
            }

            resolve({
                probability: result.probability,
                target:
                    result.target ||
                    "arrival delay >= 30 minutes",
                dataset:
                    result.dataset ||
                    "Unknown training dataset"
            });
        });
    });
}
