
"use strict";

import {
    createNotificationsLayout,
    getNotificationFixtures
} from "./notificationsLayout.js";

export class NotificationsView {

    constructor({ mountElement }) {

        if (!(mountElement instanceof HTMLElement)) {
            throw new Error(
                "NotificationsView requires a valid mount element."
            );
        }

        this.mountElement = mountElement;

        this.state = {
            mounted: false,
            activeFilter: "all",
            notifications: getNotificationFixtures(),
            feedbackMessage: ""
        };

    }

    mount() {

        if (this.state.mounted) {
            this.render();
            return;
        }

        this.state.mounted = true;

        this.render();

    }

    render() {

        this.mountElement.innerHTML =
            createNotificationsLayout({
                activeFilter:
                    this.state.activeFilter,

                notifications:
                    this.state.notifications,

                feedbackMessage:
                    this.state.feedbackMessage
            });

        this.refreshIcons();

    }

    setFilter(filter) {

        if (
            ![
                "all",
                "unread",
                "mentions"
            ].includes(filter)
        ) {
            return;
        }

        this.state.activeFilter = filter;
        this.state.feedbackMessage = "";

        this.render();

    }

    markAsRead(notificationId) {

        this.state.notifications =
            this.state.notifications.map(
                (notification) => {

                    if (
                        notification.id !== notificationId
                    ) {
                        return notification;
                    }

                    return {
                        ...notification,
                        read: true
                    };

                }
            );

        this.state.feedbackMessage =
            "Notification marked as read.";

        this.render();

    }

    markAllAsRead() {

        this.state.notifications =
            this.state.notifications.map(
                (notification) => ({
                    ...notification,
                    read: true
                })
            );

        this.state.feedbackMessage =
            "All notifications marked as read.";

        this.render();

    }

    showFeedback(message) {

        this.state.feedbackMessage = message;

        this.render();

    }

    refreshIcons() {

        if (
            typeof window === "undefined" ||
            !window.lucide ||
            typeof window.lucide.createIcons !==
                "function"
        ) {
            return;
        }

        window.lucide.createIcons();

    }

    getMountElement() {
        return this.mountElement;
    }

    isMounted() {
        return this.state.mounted;
    }

    destroy() {

        this.mountElement.innerHTML = "";

        this.state.mounted = false;

    }

}