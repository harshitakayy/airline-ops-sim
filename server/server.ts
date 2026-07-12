import express from "express";
import { runSimulation } from "../src/engine/clock";

const app= express();
app.use(express.json());
let simulation= runSimulation();

app.get("/flights",(req,res)=>{
    res.json(simulation.flights);
});

app.get("/flights/:id",(req,res)=>{
    const flight= simulation.flights.find(flight=> flight.id===req.params.id);
    if(!flight)
    {
        return res.status(404).json({error: "Flight not found"});
    }
    res.json(flight);
});

app.get("/aircraft",(req,res)=>{
    res.json(simulation.aircrafts);
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