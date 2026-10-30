import { Router } from "express";
import mqttClient from "../config/mqtt.js";

const router = Router();

router.post("/publish", (req, res) => {
  const { message } = req.body;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "A message is required",
    });
  }

  mqttClient.publish("demo/notifications", message, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Failed to publish MQTT message",
      });
    }

    res.json({
      success: true,
      topic: "demo/notifications",
      message,
    });
  });
});

export default router;