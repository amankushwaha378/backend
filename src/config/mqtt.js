import mqtt from "mqtt";

const mqttClient = mqtt.connect("mqtt://localhost:1883");

mqttClient.on("connect", () => {
  console.log("Connected to Mosquitto MQTT broker");
});

mqttClient.on("error", (err) => {
  console.error("MQTT error:", err.message);
});

export default mqttClient;