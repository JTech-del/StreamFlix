"use strict";

export class NotificationsController {

    constructor({ view }) {

        if (!view) {
            throw new Error(
                "NotificationsController requires a valid view."
            );
        }

        this.view = view;
        this.bound = false;

        this.handleClick =
            this.handleClick.bind(this);

    }

    init() {

        if (this.bound) {
            return;
        }

        const mountElement =
            this.view.getMountElement();

        if (!(mountElement instanceof HTMLElement)) {
            return;
        }

        mountElement.addEventListener(
            "click",
            this.handleClick
        );

        this.bound = true;

    }

    handleClick(event) {

        const filterElement =
            event.target.closest(
                "[data-notification-filter]"
            );

        if (filterElement) {

            this.view.setFilter(
                filterElement.dataset.notificationFilter
            );

            return;
        }

        const actionElement =
            event.target.closest(
                "[data-notifications-action], [data-notification-action]"
            );

        if (!actionElement) {
            return;
        }

        const action =
            actionElement.dataset.notificationsAction ||
            actionElement.dataset.notificationAction;

        switch (action) {

            case "mark-read": {

                const notificationElement =
                    actionElement.closest(
                        "[data-notification-id]"
                    );

                if (!notificationElement) {
                    return;
                }

                this.view.markAsRead(
                    notificationElement.dataset.notificationId
                );

                return;
            }

            case "mark-all": {

                this.view.markAllAsRead();

                return;
            }

            case "settings": {

                this.view.showFeedback(
                    "Notification preferences will be connected to Settings."
                );

                return;
            }

            case "primary": {

                this.view.showFeedback(
                    "This notification action will open its destination."
                );

                return;
            }

            case "menu": {

                this.view.showFeedback(
                    "Notification actions menu is ready for backend integration."
                );

                return;
            }

            case "load-more": {

                this.view.showFeedback(
                    "Older notification history will load through pagination."
                );

                return;
            }

            default: {

                console.warn(
                    `Unknown notification action: ${action}`
                );

            }

        }

    }

    destroy() {

        const mountElement =
            this.view.getMountElement();

        if (mountElement instanceof HTMLElement) {

            mountElement.removeEventListener(
                "click",
                this.handleClick
            );

        }

        this.bound = false;

    }

}