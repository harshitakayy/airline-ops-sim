import express from "express";
import { runSimulation } from "../src/engine/clock";
import cors from "cors";
import { getFlights } from "../src/db/flights";
import { getAircrafts } from "../src/db/aircrafts";
import { getData } from "../src/db/data";


const app= express();
app.use(cors());
app.use(express.json());

async function start()
{
    let simulation= await runSimulation();
    app.get("/flights", async(req,res)=>{
    const data=await getData();
    res.json(data.flights);
    });

    app.get("/flights/:id", async(req,res)=>{
        const data=await getData();
        const flight= data.flights.find(flight=> flight.id===req.params.id);
        if(!flight)
        {
            return res.status(404).json({error: "Flight not found"});
        }
        res.json(flight);
    });

    app.get("/aircraft", async(req,res)=>{
        const data=await getData();
        res.json(data.aircrafts);
    });

    app.get("/simulation", (req,res)=>{
    res.json(simulation);
    });

    app.get("/metrics", (req, res) => {
        res.json(simulation.metrics);
    });

    app.get("/events",(req,res)=>{
        res.json(simulation.events);
    });

    app.post("/simulation/run", (req, res) =>{
        console.log(req.body);
        simulation= runSimulation(undefined,req.body);
        res.json(simulation);
    });

    app.listen(3000, ()=> {
        console.log("Server is running on port 3000");
    });
}

start();
