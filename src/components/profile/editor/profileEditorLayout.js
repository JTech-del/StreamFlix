"use strict";

export function createProfileEditorLayout({
    profile = {}
} = {}) {

    const displayName =
        profile.displayName ||
        "Godfrey Emmanuel";

    const username =
        profile.username ||
        "godfrey";

    const bio =
        profile.bio ||
        "Frontend Developer";

    return `
        <section
            class="profile-editor"
            aria-labelledby="profile-editor-title"
        >

            <header class="profile-editor__header">

                <div>

                    <span class="profile-editor__eyebrow">
                        Profile
                    </span>

                    <h2
                        id="profile-editor-title"
                        class="profile-editor__title"
                    >
                        Edit Profile
                    </h2>

                    <p class="profile-editor__description">
                        Update the information displayed on your
                        StreamFlix profile.
                    </p>

                </div>

                <button
                    type="button"
                    class="profile-editor__close"
                    data-profile-editor-action="cancel"
                    aria-label="Close profile editor"
                >
                    <i data-lucide="x"></i>
                </button>

            </header>

            <form
                class="profile-editor__form"
                data-profile-editor-form
                novalidate
            >

                <div class="profile-editor__avatar">

                    <div
                        class="profile-editor__avatar-mark"
                        aria-hidden="true"
                    >
                        GE
                    </div>

                    <div>

                        <strong>
                            Profile information
                        </strong>

                        <p>
                            These details help personalize
                            your StreamFlix account.
                        </p>

                    </div>

                </div>

                <div class="profile-editor__fields">

                    <div class="profile-editor__field">

                        <label
                            for="profile-display-name"
                        >
                            Display name
                        </label>

                        <input
                            id="profile-display-name"
                            name="displayName"
                            type="text"
                            value="${displayName}"
                            maxlength="80"
                            autocomplete="name"
                            required
                        />

                        <span
                            class="profile-editor__hint"
                        >
                            Your name as other users see it.
                        </span>

                        <span
                            class="profile-editor__error"
                            data-profile-editor-error="displayName"
                            role="alert"
                        ></span>

                    </div>

                    <div class="profile-editor__field">

                        <label
                            for="profile-username"
                        >
                            Username
                        </label>

                        <div
                            class="profile-editor__input-prefix"
                        >
                            <span>@</span>

                            <input
                                id="profile-username"
                                name="username"
                                type="text"
                                value="${username}"
                                maxlength="30"
                                autocomplete="username"
                                required
                            />

                        </div>

                        <span
                            class="profile-editor__hint"
                        >
                            3–30 characters. Letters, numbers,
                            underscores, and hyphens are allowed.
                        </span>

                        <span
                            class="profile-editor__error"
                            data-profile-editor-error="username"
                            role="alert"
                        ></span>

                    </div>

                    <div class="profile-editor__field">

                        <label
                            for="profile-bio"
                        >
                            Bio
                        </label>

                        <textarea
                            id="profile-bio"
                            name="bio"
                            rows="5"
                            maxlength="240"
                            placeholder="Tell people a little about yourself..."
                        >${bio}</textarea>

                        <div
                            class="profile-editor__field-footer"
                        >

                            <span
                                class="profile-editor__hint"
                            >
                                Maximum 240 characters.
                            </span>

                            <span
                                class="profile-editor__counter"
                                data-profile-editor-counter="bio"
                            >
                                ${bio.length}/240
                            </span>

                        </div>

                        <span
                            class="profile-editor__error"
                            data-profile-editor-error="bio"
                            role="alert"
                        ></span>

                    </div>

                </div>

                <div
                    class="profile-editor__status"
                    data-profile-editor-status
                    role="status"
                    aria-live="polite"
                ></div>

                <footer class="profile-editor__footer">

                    <button
                        type="button"
                        class="profile-editor__button profile-editor__button--secondary"
                        data-profile-editor-action="cancel"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        class="profile-editor__button profile-editor__button--primary"
                        data-profile-editor-action="save"
                    >
                        <i data-lucide="save"></i>
                        <span>Save changes</span>
                    </button>

                </footer>

            </form>

        </section>
    `;
}