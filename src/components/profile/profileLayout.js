"use strict";

/*======================================
  File:
  src/components/profile/profileLayout.js

  Description:
  Defines the structural layout for the
  StreamFlix Profile / Settings view.

  This file owns markup structure only.
  No business logic or API calls belong here.
======================================*/

export function createProfileLayout() {

    return `
        <section
            class="profile-page"
            aria-labelledby="profile-page-title"
        >

            <div class="profile-page__container">

                <!--==================================
                Page Header
                ==================================-->

                <header class="profile-page__header">

                    <div>

                        <p class="profile-page__eyebrow">
                            Account Center
                        </p>

                        <h1
                            id="profile-page-title"
                            class="profile-page__title"
                        >
                            Settings
                        </h1>

                        <p class="profile-page__description">
                            Manage your public profile, subscription,
                            security, and streaming preferences.
                        </p>

                    </div>

                </header>


                <!--==================================
                Profile
                ==================================-->

                <section
                    class="profile-section profile-section--identity"
                    aria-labelledby="profile-identity-title"
                >

                    <div class="profile-section__heading">

                        <div>

                            <p class="profile-section__eyebrow">
                                Profile
                            </p>

                            <h2
                                id="profile-identity-title"
                                class="profile-section__title"
                            >
                                Your profile
                            </h2>

                        </div>

                        <button
                            type="button"
                            class="profile-action-button"
                            data-profile-action="edit-profile"
                        >
                            <i
                                data-lucide="pencil"
                                aria-hidden="true"
                            ></i>

                            <span>Edit Profile</span>

                        </button>

                    </div>


                    <div class="profile-identity">

                        <div
                            class="profile-avatar"
                            aria-hidden="true"
                        >
                            GE
                        </div>


                        <div class="profile-identity__content">

                            <h3 class="profile-identity__name">
                                Godfrey Emmanuel
                            </h3>

                            <p class="profile-identity__username">
                                @godfrey
                            </p>

                            <p class="profile-identity__bio">
                                Frontend Developer
                            </p>

                        </div>

                    </div>

                </section>


                <!--==================================
                Account & Billing
                ==================================-->

                <section
                    class="profile-section"
                    aria-labelledby="account-billing-title"
                >

                    <div class="profile-section__heading">

                        <div>

                            <p class="profile-section__eyebrow">
                                Account
                            </p>

                            <h2
                                id="account-billing-title"
                                class="profile-section__title"
                            >
                                Account &amp; Billing
                            </h2>

                        </div>

                    </div>


                    <div class="profile-settings-grid">

                        ${createProfileSettingCard({
                            icon: "mail",
                            title: "Email",
                            value: "Account email",
                            action: "account-email"
                        })}

                        ${createProfileSettingCard({
                            icon: "credit-card",
                            title: "Current Plan",
                            value: "Subscription plan",
                            action: "billing-plan"
                        })}

                        ${createProfileSettingCard({
                            icon: "calendar-days",
                            title: "Next Invoice",
                            value: "Billing information",
                            action: "billing-invoice"
                        })}

                        ${createProfileSettingCard({
                            icon: "wallet-cards",
                            title: "Payment Method",
                            value: "Payment information",
                            action: "billing-payment"
                        })}

                        ${createProfileSettingCard({
                            icon: "circle-check",
                            title: "Account Status",
                            value: "Account status",
                            action: "account-status"
                        })}

                        ${createProfileSettingCard({
                            icon: "calendar-heart",
                            title: "Member Since",
                            value: "Membership information",
                            action: "member-since"
                        })}

                    </div>

                </section>


                <!--==================================
                Security & Privacy
                ==================================-->

                <section
                    class="profile-section"
                    aria-labelledby="security-title"
                >

                    <div class="profile-section__heading">

                        <div>

                            <p class="profile-section__eyebrow">
                                Protection
                            </p>

                            <h2
                                id="security-title"
                                class="profile-section__title"
                            >
                                Security &amp; Privacy
                            </h2>

                        </div>

                    </div>


                    <div class="profile-settings-list">

                        ${createProfilePreferenceRow({
                            icon: "key-round",
                            title: "Change Password",
                            description:
                                "Update the password used to protect your account.",
                            action: "change-password"
                        })}

                        ${createProfilePreferenceRow({
                            icon: "shield-check",
                            title: "Two-Factor Authentication",
                            description:
                                "Add another layer of protection to your account.",
                            action: "two-factor",
                            status: "Coming soon"
                        })}

                        ${createProfilePreferenceRow({
                            icon: "link-2",
                            title: "Connected Accounts",
                            description:
                                "Manage accounts connected to StreamFlix.",
                            action: "connected-accounts",
                            status: "Coming soon"
                        })}

                        ${createProfilePreferenceRow({
                            icon: "monitor-smartphone",
                            title: "Active Sessions & Devices",
                            description:
                                "Review devices and sessions currently associated with your account.",
                            action: "sessions"
                        })}

                        ${createProfilePreferenceRow({
                            icon: "database-backup",
                            title: "Request Personal Data Archive",
                            description:
                                "Request a copy of the personal information associated with your account.",
                            action: "data-archive",
                            status: "Coming soon"
                        })}

                    </div>

                </section>


                <!--==================================
                Streaming Preferences
                ==================================-->

                <section
                    class="profile-section"
                    aria-labelledby="streaming-preferences-title"
                >

                    <div class="profile-section__heading">

                        <div>

                            <p class="profile-section__eyebrow">
                                Playback
                            </p>

                            <h2
                                id="streaming-preferences-title"
                                class="profile-section__title"
                            >
                                Streaming Preferences
                            </h2>

                        </div>

                    </div>


                    <div class="profile-settings-list">

                        ${createProfilePreferenceRow({
                            icon: "monitor-play",
                            title: "Playback & Video Quality",
                            description:
                                "Choose your preferred playback quality.",
                            action: "playback-quality"
                        })}

                        ${createProfilePreferenceRow({
                            icon: "languages",
                            title: "Audio & Subtitles",
                            description:
                                "Manage preferred audio languages and subtitle settings.",
                            action: "audio-subtitles"
                        })}

                        ${createProfilePreferenceRow({
                            icon: "play-circle",
                            title: "Autoplay",
                            description:
                                "Automatically play the next title when available.",
                            action: "autoplay",
                            control: true
                        })}

                        ${createProfilePreferenceRow({
                            icon: "baby",
                            title: "Parental Controls & Maturity Ratings",
                            description:
                                "Manage content restrictions for this account.",
                            action: "parental-controls",
                            status: "Coming soon"
                        })}

                    </div>

                </section>


                <!--==================================
                Notification Preferences
                ==================================-->

                <section
                    class="profile-section"
                    aria-labelledby="notification-preferences-title"
                >

                    <div class="profile-section__heading">

                        <div>

                            <p class="profile-section__eyebrow">
                                Preferences
                            </p>

                            <h2
                                id="notification-preferences-title"
                                class="profile-section__title"
                            >
                                Notifications
                            </h2>

                            <p class="profile-section__description">
                                Control which types of updates you want to receive.
                            </p>

                        </div>

                    </div>


                    <div class="profile-settings-list">

                        ${createProfilePreferenceRow({
                            icon: "megaphone",
                            title: "Marketing & New Releases",
                            description:
                                "Receive updates about new releases, recommendations, and promotions.",
                            action: "marketing-notifications",
                            control: true
                        })}

                        ${createProfilePreferenceRow({
                            icon: "message-circle",
                            title: "Social Activity & Comments",
                            description:
                                "Receive updates about social interactions and activity.",
                            action: "social-notifications",
                            control: true
                        })}

                    </div>

                </section>


                <!--==================================
                Danger Zone
                ==================================-->

                <section
                    class="profile-section profile-section--danger"
                    aria-labelledby="danger-zone-title"
                >

                    <div class="profile-section__heading">

                        <div>

                            <p class="profile-section__eyebrow">
                                Account Management
                            </p>

                            <h2
                                id="danger-zone-title"
                                class="profile-section__title"
                            >
                                Danger Zone
                            </h2>

                            <p class="profile-section__description">
                                These actions can have permanent consequences.
                            </p>

                        </div>

                    </div>


                    <div class="profile-danger-actions">

                        <button
                            type="button"
                            class="profile-danger-action"
                            data-profile-action="cancel-subscription"
                        >

                            <span>

                                <strong>
                                    Cancel Subscription
                                </strong>

                                <small>
                                    End your current subscription.
                                </small>

                            </span>

                            <i
                                data-lucide="chevron-right"
                                aria-hidden="true"
                            ></i>

                        </button>


                        <button
                            type="button"
                            class="profile-danger-action"
                            data-profile-action="delete-account"
                        >

                            <span>

                                <strong>
                                    Delete Account
                                </strong>

                                <small>
                                    Permanently remove your StreamFlix account.
                                </small>

                            </span>

                            <i
                                data-lucide="chevron-right"
                                aria-hidden="true"
                            ></i>

                        </button>

                    </div>

                </section>

            </div>

        </section>
    `;
}


/*======================================
  Setting Card
======================================*/

function createProfileSettingCard({
    icon,
    title,
    value,
    action
}) {

    return `

        <button
            type="button"
            class="profile-setting-card"
            data-profile-action="${action}"
        >

            <span class="profile-setting-card__icon">

                <i
                    data-lucide="${icon}"
                    aria-hidden="true"
                ></i>

            </span>


            <span class="profile-setting-card__content">

                <strong>
                    ${title}
                </strong>

                <small>
                    ${value}
                </small>

            </span>


            <i
                data-lucide="chevron-right"
                class="profile-setting-card__arrow"
                aria-hidden="true"
            ></i>

        </button>
    `;
}


/*======================================
  Preference Row
======================================*/

function createProfilePreferenceRow({
    icon,
    title,
    description,
    action,
    status = null,
    control = false
}) {

    return `

        <div
            class="profile-preference-row"
            data-profile-setting="${action}"
        >

            <span class="profile-preference-row__icon">

                <i
                    data-lucide="${icon}"
                    aria-hidden="true"
                ></i>

            </span>


            <div class="profile-preference-row__content">

                <div class="profile-preference-row__title">

                    <strong>
                        ${title}
                    </strong>

                    ${
                        status
                            ? `
                                <span class="profile-status">
                                    ${status}
                                </span>
                            `
                            : ""
                    }

                </div>

                <p>
                    ${description}
                </p>

            </div>


            ${
                control
                    ? `
                        <label
                            class="profile-toggle"
                            aria-label="${title}"
                        >

                            <input
                                type="checkbox"
                                data-profile-toggle="${action}"
                            >

                            <span
                                class="profile-toggle__track"
                                aria-hidden="true"
                            ></span>

                        </label>
                    `
                    : `
                        <button
                            type="button"
                            class="profile-preference-row__action"
                            data-profile-action="${action}"
                            aria-label="Open ${title}"
                        >

                            <i
                                data-lucide="chevron-right"
                                aria-hidden="true"
                            ></i>

                        </button>
                    `
            }

        </div>
    `;
}