"use strict";

const rabbitmqTopology = {
    exchanges: {
        videoProcessing: {
            name: "streamflix.video",
            type: "direct",
            options: {
                durable: true
            }
        },

        videoRetry: {
            name: "streamflix.video.retry",
            type: "direct",
            options: {
                durable: true
            }
        },

        notification: {
            name: "streamflix.notification",
            type: "direct",
            options: {
                durable: true
            }
        }
    },

    queues: {
        videoProcessing: {
            name: "streamflix.video.processing",
            options: {
                durable: true
            }
        },

        videoRetry: {
            name: "streamflix.video.retry",
            options: {
                durable: true,
                arguments: {
                    "x-dead-letter-exchange":
                        "streamflix.video",
                    "x-dead-letter-routing-key":
                        "video.processing"
                }
            }
        },

        notification: {
            name: "streamflix.notification",
            options: {
                durable: true
            }
        }
    },

    routingKeys: {
        videoProcessing: "video.processing",

        videoRetry: "video.retry",

        notification: "notification"
    }
};

export default rabbitmqTopology;