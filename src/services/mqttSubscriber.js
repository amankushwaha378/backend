import mqttClient from "../config/mqtt.js";

mqttClient.on("connect", () => {
  console.log("MQTT subscriber connected");

  mqttClient.subscribe("demo/notifications", (err) => {
    if (err) {
      console.error("Subscription failed:", err.message);
      return;
    }

    console.log("Subscribed to demo/notifications");
  });
});

mqttClient.on("message", (topic, payload) => {
  console.log("MQTT message received!");
  console.log("Topic:", topic);
  console.log("Message:", payload.toString());
});