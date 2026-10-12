"use strict";

const NOTIFICATION_FIXTURES = Object.freeze([
    {
        id: "notification-001",
        type: "release",
        sender: "StreamFlix",
        initials: "SF",
        title: "New release available",
        message: "A new title matching your interests is now available to watch.",
        timestamp: "12 minutes ago",
        read: false,
        actionLabel: "Watch now"
    },
    {
        id: "notification-002",
        type: "system",
        sender: "StreamFlix",
        initials: "SF",
        title: "Your profile is ready",
        message: "Your StreamFlix profile has been successfully configured.",
        timestamp: "2 hours ago",
        read: false,
        actionLabel: "View profile"
    },
    {
        id: "notification-003",
        type: "activity",
        sender: "StreamFlix Community",
        initials: "SC",
        title: "Someone interacted with your activity",
        message: "A community member responded to something you shared.",
        timestamp: "Yesterday",
        read: true,
        actionLabel: "View activity"
    },
    {
        id: "notification-004",
        type: "security",
        sender: "StreamFlix Security",
        initials: "SS",
        title: "Security reminder",
        message: "Review your active sessions and devices regularly.",
        timestamp: "2 days ago",
        read: true,
        actionLabel: "Review security"
    }
]);

export function getNotificationFixtures() {
    return NOTIFICATION_FIXTURES.map(
        (notification) => ({ ...notification })
    );
}

function createNotificationItem(notification) {

    const unreadClass =
        notification.read
            ? ""
            : " notification-item--unread";

    const unreadLabel =
        notification.read
            ? ""
            : `
                <span
                    class="notification-item__unread-dot"
                    aria-label="Unread"
                ></span>
            `;

    return `
        <article
            class="notification-item${unreadClass}"
            data-notification-id="${notification.id}"
            data-notification-read="${notification.read}"
        >

            <div class="notification-item__avatar" aria-hidden="true">
                ${notification.initials}
            </div>

            <div class="notification-item__body">

                <div class="notification-item__topline">

                    <div class="notification-item__sender">
                        ${notification.sender}
                    </div>

                    <time
                        class="notification-item__time"
                    >
                        ${notification.timestamp}
                    </time>

                </div>

                <div class="notification-item__title-row">

                    ${unreadLabel}

                    <h3 class="notification-item__title">
                        ${notification.title}
                    </h3>

                </div>

                <p class="notification-item__message">
                    ${notification.message}
                </p>

                <div class="notification-item__actions">

                    <button
                        type="button"
                        class="notification-action"
                        data-notification-action="primary"
                    >
                        ${notification.actionLabel}
                    </button>

                    ${
                        notification.read
                            ? ""
                            : `
                                <button
                                    type="button"
                                    class="notification-action notification-action--quiet"
                                    data-notification-action="mark-read"
                                >
                                    Mark as read
                                </button>
                            `
                    }

                </div>

            </div>

            <button
                type="button"
                class="notification-item__menu"
                aria-label="More options"
                data-notification-action="menu"
            >
                <i data-lucide="more-horizontal"></i>
            </button>

        </article>
    `;
}

export function createNotificationsLayout({
    activeFilter = "all",
    notifications = NOTIFICATION_FIXTURES,
    feedbackMessage = ""
} = {}) {

    const unreadCount =
        notifications.filter(
            (notification) => !notification.read
        ).length;

    const visibleNotifications =
        notifications.filter((notification) => {

            if (activeFilter === "unread") {
                return !notification.read;
            }

            if (activeFilter === "mentions") {
                return notification.type === "activity";
            }

            return true;

        });

    const notificationItems =
        visibleNotifications.length
            ? visibleNotifications
                .map(createNotificationItem)
                .join("")
            : `
                <div class="notifications-empty">
                    <div class="notifications-empty__icon">
                        <i data-lucide="bell-off"></i>
                    </div>

                    <h2>
                        You're all caught up
                    </h2>

                    <p>
                        There are no notifications in this category.
                    </p>
                </div>
            `;

    return `
        <section
            class="notifications-view"
            aria-labelledby="notifications-title"
        >

            <header class="notifications-header">

                <div class="notifications-header__content">

                    <span class="notifications-header__eyebrow">
                        Activity Center
                    </span>

                    <h1
                        id="notifications-title"
                        class="notifications-header__title"
                    >
                        Notifications
                    </h1>

                    <p class="notifications-header__description">
                        Stay up to date with releases, account activity,
                        security events, and community interactions.
                    </p>

                </div>

                <div class="notifications-header__actions">

                    <button
                        type="button"
                        class="notifications-header__button"
                        data-notifications-action="settings"
                    >
                        <i data-lucide="settings-2"></i>
                        <span>Settings</span>
                    </button>

                    <button
                        type="button"
                        class="notifications-header__button"
                        data-notifications-action="mark-all"
                        ${
                            unreadCount === 0
                                ? "disabled"
                                : ""
                        }
                    >
                        <i data-lucide="check-check"></i>
                        <span>Mark all as read</span>
                    </button>

                </div>

            </header>

            <div
                class="notifications-summary"
                aria-live="polite"
            >
                <span class="notifications-summary__status">
                    <span
                        class="notifications-summary__indicator"
                        aria-hidden="true"
                    ></span>

                    Notifications are up to date
                </span>

                ${
                    unreadCount > 0
                        ? `
                            <span class="notifications-summary__count">
                                ${unreadCount} unread
                            </span>
                        `
                        : `
                            <span class="notifications-summary__count">
                                All read
                            </span>
                        `
                }

            </div>

            <nav
                class="notifications-filters"
                aria-label="Notification filters"
            >

                <button
                    type="button"
                    class="notifications-filter ${
                        activeFilter === "all"
                            ? "notifications-filter--active"
                            : ""
                    }"
                    data-notification-filter="all"
                    aria-current="${
                        activeFilter === "all"
                            ? "page"
                            : "false"
                    }"
                >
                    All
                    <span>${notifications.length}</span>
                </button>

                <button
                    type="button"
                    class="notifications-filter ${
                        activeFilter === "unread"
                            ? "notifications-filter--active"
                            : ""
                    }"
                    data-notification-filter="unread"
                    aria-current="${
                        activeFilter === "unread"
                            ? "page"
                            : "false"
                    }"
                >
                    Unread
                    <span>${unreadCount}</span>
                </button>

                <button
                    type="button"
                    class="notifications-filter ${
                        activeFilter === "mentions"
                            ? "notifications-filter--active"
                            : ""
                    }"
                    data-notification-filter="mentions"
                    aria-current="${
                        activeFilter === "mentions"
                            ? "page"
                            : "false"
                    }"
                >
                    Mentions
                    <span>
                        ${
                            notifications.filter(
                                (notification) =>
                                    notification.type === "activity"
                            ).length
                        }
                    </span>
                </button>

            </nav>

           ${
    feedbackMessage
        ? `
            <div
                class="notifications-feedback"
                role="status"
                aria-live="polite"
            >
                <i data-lucide="check-circle-2"></i>
                <span>${feedbackMessage}</span>
            </div>
        `
        : ""
}

<div class="notifications-list">
    ${notificationItems}
</div>

            <div class="notifications-history">

                <button
                    type="button"
                    class="notifications-history__button"
                    data-notifications-action="load-more"
                >
                    <span>View older history</span>
                    <i data-lucide="arrow-down"></i>
                </button>

            </div>

        </section>
    `;
}