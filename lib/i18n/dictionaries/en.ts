import type { Dictionary } from "@/lib/i18n/dictionaries/es";

/**
 * `satisfies Dictionary` (no `as Dictionary`) es deliberado: obliga a
 * que este objeto tenga EXACTAMENTE la misma forma que `es.ts` -- ni una
 * clave de menos (error de compilación) ni una de más (también error,
 * a diferencia de una anotación de tipo normal que permitiría propiedades
 * extra en un objeto literal solo si no hay excess property check, cosa
 * que sí aplica acá por ser un literal). El test de paridad de claves en
 * `__tests__/dictionaries.test.ts` es la misma verificación pero en
 * tiempo de ejecución, para dejar constancia explícita en la suite de
 * tests de que esto se cuida a propósito.
 */
export const en = {
  common: {
    appName: "GitHub Wrapped"
  },
  landing: {
    title: "GitHub Wrapped",
    subtitle: "Discover how you coded this year.",
    connectButton: "Connect GitHub",
    privacyNote:
      "We only analyze your public repositories. Access to private repositories is optional and enabled separately later on."
  },
  settings: {
    pageTitle: "Settings",
    notificationsSectionTitle: "Notifications",
    notificationsSectionDescription:
      "Choose which email alerts you want to receive. You can turn them off at any time.",
    wrappedReadyLabel: "Your annual Wrapped is ready",
    wrappedReadyDescription: "An email when the Wrapped for a just-closed year is generated.",
    streakMilestoneLabel: "New commit streaks",
    streakMilestoneDescription: "An email when you reach a 7, 30, or 100 day streak.",
    languageSectionTitle: "Language",
    languageSectionDescription: "Choose the language for the interface and the emails we send you.",
    languageSpanish: "Español",
    languageEnglish: "English",
    preferenceUpdateError: "Couldn't update the preference.",
    privateRepos: {
      title: "Private repositories",
      intro: "By default, GitHub Wrapped only analyzes your public repositories. If you turn this on, we'll also read the",
      introBold: "names, commits, and languages",
      introRest: "of your private repositories to include them in your stats.",
      note: "We never read or store the",
      noteBold: "code itself",
      noteRest:
        "— only aggregated metadata (how many commits, in what language, when). That metadata is never made public automatically: sharing your Wrapped is still a separate decision (see",
      noteShareLink: "Share",
      noteEnd:
        "inside each Wrapped). You can turn this off at any time — doing so deletes the private repo data already synced, not just stops fetching new data.",
      connectButton: "Connect private repos",
      includedLabel: "Private repos included",
      notIncludedLabel: "Private repos not included",
      enabledOnLabel: "Enabled on {date}",
      disableButton: "Disable",
      enableButton: "Enable",
      cancelButton: "Cancel",
      confirmDisable: "Yes, disable and delete private data",
      confirmEnable: "Yes, enable",
      applying: "Applying…",
      genericError: "Couldn't update the setting."
    },
    dataExport: {
      title: "Export your data",
      description:
        "Download a copy of everything GitHub Wrapped stores about you: profile, repositories, commits, languages, generated Wrapped reports, insights, badges, and comparisons. Never includes your GitHub access tokens.",
      requestButton: "Request export",
      requestAnother: "Request another export",
      statusQueued: "Queued…",
      statusRunning: "Generating your export…",
      statusCompleted: "Your export is ready.",
      statusFailed: "Couldn't generate the export. Try again.",
      downloadButton: "Download JSON",
      genericError: "Couldn't request the export.",
      rateLimitError: "You've already requested the maximum exports allowed today. Try again tomorrow."
    },
    deleteAccount: {
      title: "Delete your account",
      description:
        "This permanently and irreversibly deletes your account and all your data: synced repositories, commits, generated Wrapped reports, badges, comparisons, and preferences. There's no way to undo this.",
      deleteButton: "Delete my account",
      cancelButton: "Cancel",
      confirmLabel: "Type your username ({username}) to confirm",
      confirmPlaceholder: "your-username",
      confirmButton: "Yes, delete my account forever",
      deleting: "Deleting…",
      mismatchError: "The username doesn't match.",
      genericError: "Couldn't delete the account."
    }
  },
  notificationsEmail: {
    wrappedReady: {
      subject: "Your GitHub Wrapped {year} is ready 🎉",
      greetingNamed: "Hi {name}",
      greetingGeneric: "Hi",
      body: "Your GitHub Wrapped {year} was just generated and is waiting for you: your commit volume, your languages, your longest streak, and the patterns we found in your activity this year.",
      cta: "View my Wrapped",
      footer:
        "You're receiving this email because you have notifications enabled on GitHub Wrapped. You can turn them off at any time from your settings."
    },
    streakMilestone: {
      subject: "New streak unlocked: {badgeLabel} 🔥",
      greetingNamed: "Hi {name}",
      greetingGeneric: "Hi",
      body: 'You reached a {streakLength}-day coding streak and earned the "{badgeLabel}" badge.',
      cta: "View my dashboard",
      footer:
        "You're receiving this email because you have notifications enabled on GitHub Wrapped. You can turn them off at any time from your settings."
    }
  },
  badges: {
    streak_7: { label: "7-day streak", description: "You coded 7 days in a row." },
    streak_30: { label: "30-day streak", description: "You coded 30 days in a row." },
    streak_100: { label: "100-day streak", description: "You coded 100 days in a row." },
    polyglot_5: {
      label: "Polyglot",
      description: "You coded in 5 or more different languages."
    },
    night_shift: {
      label: "Night shift",
      description: "More than half of your commits happened at night."
    },
    century_club: { label: "Century Club", description: "100 or more commits in a year." },
    marathon: { label: "Marathon", description: "1,000 or more commits in a year." }
  },
  periods: {
    last30: "Last 30 days",
    calendarYear: "This year",
    rolling12: "Last 12 months"
  },
  dashboard: {
    greeting: "Hi, {name}",
    settingsLink: "Settings",
    compareLink: "Compare",
    viewWrappedLink: "View my {year} Wrapped",
    syncTitle: "GitHub sync",
    syncDescriptionIdle: "Pulls in your commits, repos, and languages.",
    syncDescriptionActive: "Analyzing your GitHub...",
    syncButtonIdle: "Generate my Wrapped",
    syncButtonActive: "Syncing…",
    syncGenericError: "Sync failed.",
    emptyStateTitle: "No data yet",
    emptyStateDescription: "Sync your GitHub account above to see your activity, languages, and streaks.",
    periodEmptyTitle: "No activity in this period",
    periodEmptyDescription: "Try a wider range, or wait for the sync to finish if you just connected your account.",
    periodLoadError: "Couldn't load the selected period. Try again.",
    statCommits: "Commits",
    statActiveRepos: "Active repos",
    statLanguages: "Languages",
    statActiveDays: "Active days",
    activitySectionTitle: "Activity",
    weeklyTrendSectionTitle: "Weekly trend",
    languagesSectionTitle: "Languages",
    badgesSectionTitle: "Badges",
    badgesEmpty: "You haven't earned any badges yet. They're awarded automatically when you sync.",
    insightsSectionTitle: "Insights from your year",
    insightsEmpty: "Not enough data yet to generate insights for this period.",
    streakNoActive: "No active streak",
    streakDaysInARow: "days in a row, right now",
    streakRecordNow: "record (it's happening now!)",
    streakRecordOfPeriod: "record for this period",
    scoreLabel: "Developer Activity Score",
    scoreHowItsCalculated: "How it's calculated",
    scoreDimensions: {
      consistency: "Consistency",
      volume: "Volume",
      streak: "Streaks",
      diversity: "Diversity"
    },
    chartNoActivity: "No activity in this period yet.",
    chartNoLanguages: "No language data yet.",
    weekOf: "Week of {label}",
    heatmapHoverHint: "Hover over a day to see the detail",
    heatmapLess: "Less",
    heatmapMore: "More",
    monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    weekdayShort: { mon: "Mon", wed: "Wed", fri: "Fri" },
    commitSingular: "commit",
    commitPlural: "commits",
    insightTypeLabels: {
      night_owl: "Night owl",
      early_bird: "Early bird",
      weekend_warrior: "Weekend warrior",
      consistent_committer: "Consistency",
      language_loyalist: "Favorite language",
      polyglot: "Polyglot",
      mono_repo_focus: "Laser focus",
      serial_starter: "Serial starter",
      longest_streak: "Record streak",
      active_streak: "Active streak"
    }
  },
  wrapped: {
    closeButton: "Close",
    closeAria: "Close Wrapped",
    prevAria: "Previous slide",
    nextAria: "Next slide",
    playAutoplay: "Auto-play",
    pauseAutoplay: "Pause",
    shareButton: "Share",
    notGeneratedYet: "You haven't generated your {year} Wrapped yet.",
    inProgress: "{year} is still in progress — generate a preview with what you have so far.",
    generateButton: "Generate my Wrapped",
    generating: "Generating…",
    generateGenericError: "Couldn't generate your Wrapped. Try again.",
    opening: { eyebrow: "GitHub Wrapped", subtitle: "{username}, here's what you did this year, commit by commit." },
    volume: {
      eyebrow: "This year you wrote",
      suffix: "commits, spread across {activeDays} different days — {avgPerWeek} per week on average."
    },
    rhythm: {
      eyebrow: "Your most productive moment",
      noPattern: "No clear pattern yet",
      days: {
        Monday: "Monday",
        Tuesday: "Tuesday",
        Wednesday: "Wednesday",
        Thursday: "Thursday",
        Friday: "Friday",
        Saturday: "Saturday",
        Sunday: "Sunday"
      }
    },
    languages: { eyebrow: "Your language of the year" },
    repos: { eyebrow: "Your repository of the year", touchedPrefix: "You touched", touchedSuffix: "repositories total this year." },
    streak: { eyebrow: "Your longest streak", suffix: "days in a row coding" },
    closing: { eyebrow: "That was {year}", writtenIn: "written, mostly, in {language}", seeYouNextYear: "See you next year." },
    share: {
      title: "Share",
      closeAria: "Close share panel",
      isPublicLabel: "Your Wrapped is public",
      isPrivateLabel: "Your Wrapped is private",
      isPublicDescription: "Anyone with the link can see it.",
      isPrivateDescription: "Only you can see it.",
      makePrivate: "Make private",
      makePublic: "Make public",
      copy: "Copy",
      copied: "Copied",
      shareButton: "Share",
      downloadSectionTitle: "Download this card as an image",
      formatStory: "Story (9:16)",
      formatPost: "Post (1:1)",
      formatTwitter: "X/Twitter (16:9)",
      downloadPng: "Download PNG",
      shareTitlePrefix: "My GitHub Wrapped"
    }
  },
  comparisons: {
    pageTitle: "Comparisons",
    pageDescription:
      "Invite another user to compare their activity with yours. It's never automatic — the other person has to accept, and either of you can revoke it afterward.",
    emptyList: "You don't have any comparisons yet.",
    invitedPrefix: "You invited",
    invitedByPrefix: "Invited you",
    statusPending: "Pending",
    statusAccepted: "Accepted",
    statusDeclined: "Declined",
    viewComparison: "View comparison",
    accept: "Accept",
    cancel: "Cancel",
    revoke: "Revoke",
    inviteInputPlaceholder: "GitHub username",
    inviteButton: "Invite to compare",
    inviteSending: "Sending…",
    inviteGenericError: "Couldn't send the invitation.",
    vsLabel: "vs",
    metricCommits: "Commits",
    metricActiveDays: "Active days",
    metricLongestStreak: "Longest streak",
    metricTopLanguage: "Top language",
    metricActivityScore: "Activity Score",
    footerNote: "Based on each person's public activity over the last 12 months."
  }
} satisfies Dictionary;
