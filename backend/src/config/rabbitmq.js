const rabbitmqConfig = {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
};

export default rabbitmqConfig;