'use strict'

const strapiSocket = async (strapi) => {
    const io = require("socket.io")(strapi.server.httpServer, {
        transports: ["websocket", "polling"],
        allowEIO3: true,
        pingTimeout: 60000,
        cors: {
            origin: "*",
            methods: ["*"],
            allowedHeaders: ["user"],
            credentials: true,
        },
    });

    io.on("connection", function (socket) {
        console.log("socket connected", socket.id);

        socket.on("begin", ({ user }) => {
            console.log("Socket beggined to user", user);
            strapi.sockets = {
                ...strapi.sockets,
                [socket.id]: { socket, user },
            };
        });

        socket.on("disconnect", () => {
            console.log("user disconnected", socket.id);
            const updatedSockets = {};
            for (const [key, value] of Object.entries(strapi.sockets || {})) {
                if (value.socket.id !== socket.id) {
                    updatedSockets[key] = value;
                }
            }
            strapi.sockets = updatedSockets;
        });
    });

    strapi.io = io;
};

module.exports = {
    strapiSocket
}