/**
 * ⚠️ Fase 9: cobertura ampliada para cerrar el alcance parcial original
 * -- dashboard, Wrapped, comparaciones y repos privados ya están acá.
 * Queda fuera a propósito (documentado en README.md): la página
 * `/score` (texto explicativo largo, baja prioridad) y las imágenes PNG
 * de Open Graph/compartir (`app/wrapped/[year]/image/route.tsx`,
 * `opengraph-image.tsx`) -- son texto renderizado a píxeles, no HTML, y
 * amplían la superficie de este cambio sin aportar al caso de uso
 * principal (compartir sigue funcionando, solo que la tarjeta PNG en sí
 * queda en español). El test de paridad de claves
 * (`__tests__/dictionaries.test.ts`) obliga a que `en.ts` tenga
 * exactamente esta misma forma.
 */
export const es = {
  common: {
    appName: "GitHub Wrapped",
    backToDashboard: "Volver al panel",
    backToComparisons: "Volver a comparaciones"
  },
  landing: {
    title: "GitHub Wrapped",
    subtitle: "Descubre cómo programaste este año.",
    connectButton: "Conectar GitHub",
    privacyNote:
      "Solo analizamos tus repositorios públicos. El acceso a repositorios privados es opcional y se activa por separado más adelante."
  },
  settings: {
    pageTitle: "Configuración",
    notificationsSectionTitle: "Notificaciones",
    notificationsSectionDescription:
      "Elige qué avisos por email quieres recibir. Puedes desactivarlos en cualquier momento.",
    wrappedReadyLabel: "Tu Wrapped anual está listo",
    wrappedReadyDescription: "Un email cuando se genera el Wrapped de un año recién cerrado.",
    streakMilestoneLabel: "Nuevas rachas de commits",
    streakMilestoneDescription: "Un email cuando alcanzás una racha de 7, 30 o 100 días seguidos.",
    languageSectionTitle: "Idioma",
    languageSectionDescription: "Elige el idioma de la interfaz y de los emails que te enviamos.",
    languageSpanish: "Español",
    languageEnglish: "English",
    preferenceUpdateError: "No se pudo actualizar la preferencia.",
    privateRepos: {
      title: "Repositorios privados",
      intro: "Por defecto, GitHub Wrapped solo analiza tus repositorios públicos. Si activás esta opción, también vamos a leer los",
      introBold: "nombres, commits y lenguajes",
      introRest: "de tus repositorios privados para incluirlos en tus estadísticas.",
      note: "Nunca leemos ni almacenamos el",
      noteBold: "contenido del código",
      noteRest:
        "— solo metadata agregada (cuántos commits, en qué lenguaje, cuándo). Esa metadata nunca se hace pública automáticamente: compartir tu Wrapped sigue siendo una decisión aparte (ver",
      noteShareLink: "Compartir",
      noteEnd:
        "dentro de cada Wrapped). Podés desactivar esto en cualquier momento — al hacerlo, borramos los datos de repos privados ya sincronizados, no solo dejamos de traer nuevos.",
      connectButton: "Conectar repos privados",
      includedLabel: "Repos privados incluidos",
      notIncludedLabel: "Repos privados no incluidos",
      enabledOnLabel: "Activado el {date}",
      disableButton: "Desactivar",
      enableButton: "Activar",
      cancelButton: "Cancelar",
      confirmDisable: "Sí, desactivar y borrar datos privados",
      confirmEnable: "Sí, activar",
      applying: "Aplicando…",
      genericError: "No se pudo actualizar la configuración."
    },
    dataExport: {
      title: "Exportar tus datos",
      description:
        "Descargá una copia de todo lo que GitHub Wrapped guarda sobre vos: perfil, repositorios, commits, lenguajes, Wrapped generados, insights, badges y comparaciones. Nunca incluye tus tokens de acceso a GitHub.",
      requestButton: "Solicitar export",
      requestAnother: "Solicitar otro export",
      statusQueued: "En cola…",
      statusRunning: "Generando tu export…",
      statusCompleted: "Tu export está listo.",
      statusFailed: "No se pudo generar el export. Probá de nuevo.",
      downloadButton: "Descargar JSON",
      genericError: "No se pudo solicitar el export.",
      rateLimitError: "Ya pediste el máximo de exports permitidos por hoy. Probá de nuevo mañana."
    },
    deleteAccount: {
      title: "Eliminar tu cuenta",
      description:
        "Esto borra tu cuenta y todos tus datos de forma permanente e irreversible: repositorios sincronizados, commits, Wrapped generados, badges, comparaciones y preferencias. No hay forma de deshacer esto.",
      deleteButton: "Eliminar mi cuenta",
      cancelButton: "Cancelar",
      confirmLabel: "Escribe tu username ({username}) para confirmar",
      confirmPlaceholder: "tu-username",
      confirmButton: "Si, eliminar mi cuenta para siempre",
      deleting: "Eliminando…",
      mismatchError: "El username no coincide.",
      genericError: "No se pudo eliminar la cuenta."
    }
  },
  notificationsEmail: {
    wrappedReady: {
      subject: "Tu GitHub Wrapped {year} ya está listo 🎉",
      greetingNamed: "Hola {name}",
      greetingGeneric: "Hola",
      body: "Tu GitHub Wrapped {year} ya se generó y está esperándote: tu volumen de commits, tus lenguajes, tu racha más larga y los patrones que detectamos en tu actividad de este año.",
      cta: "Ver mi Wrapped",
      footer:
        "Recibiste este email porque tenés notificaciones activadas en GitHub Wrapped. Podés desactivarlas en cualquier momento desde tu configuración."
    },
    streakMilestone: {
      subject: "Nueva racha desbloqueada: {badgeLabel} 🔥",
      greetingNamed: "Hola {name}",
      greetingGeneric: "Hola",
      body: "Llegaste a una racha de {streakLength} días programando seguidos y ganaste el badge \"{badgeLabel}\".",
      cta: "Ver mi dashboard",
      footer:
        "Recibiste este email porque tenés notificaciones activadas en GitHub Wrapped. Podés desactivarlas en cualquier momento desde tu configuración."
    }
  },
  badges: {
    streak_7: { label: "Racha de 7 días", description: "Programaste 7 días seguidos." },
    streak_30: { label: "Racha de 30 días", description: "Programaste 30 días seguidos." },
    streak_100: { label: "Racha de 100 días", description: "Programaste 100 días seguidos." },
    polyglot_5: {
      label: "Polyglot",
      description: "Programaste en 5 lenguajes distintos o más."
    },
    night_shift: {
      label: "Night shift",
      description: "Más de la mitad de tus commits fueron de noche."
    },
    century_club: { label: "Century Club", description: "100 commits o más en un año." },
    marathon: { label: "Maratón", description: "1,000 commits o más en un año." }
  },
  periods: {
    last30: "Últimos 30 días",
    calendarYear: "Este año",
    rolling12: "Últimos 12 meses"
  },
  dashboard: {
    greeting: "Hola, {name}",
    settingsLink: "Configuración",
    compareLink: "Comparar",
    viewWrappedLink: "Ver mi Wrapped {year}",
    syncTitle: "Sincronización de GitHub",
    syncDescriptionIdle: "Trae tus commits, repos y lenguajes.",
    syncDescriptionActive: "Analizando tu GitHub...",
    syncButtonIdle: "Sincronizar",
    syncButtonActive: "Sincronizando…",
    syncGenericError: "Error en la sincronización.",
    syncLastSynced: "Última sincronización: {when}",
    syncNeverSynced: "Sincronizando tu actividad por primera vez…",
    syncRefreshAria: "Sincronizar ahora",
    emptyStateTitle: "Todavía no hay datos",
    emptyStateDescription: "Sincroniza tu cuenta de GitHub arriba para ver tu actividad, lenguajes y rachas.",
    periodEmptyTitle: "Sin actividad en este período",
    periodEmptyDescription:
      "Prueba con un rango más amplio, o espera a que termine la sincronización si acabas de conectar tu cuenta.",
    periodLoadError: "No se pudo cargar el período seleccionado. Intenta de nuevo.",
    statCommits: "Commits",
    statActiveRepos: "Repos activos",
    statLanguages: "Lenguajes",
    statActiveDays: "Días activos",
    activitySectionTitle: "Actividad",
    weeklyTrendSectionTitle: "Tendencia semanal",
    languagesSectionTitle: "Lenguajes",
    badgesSectionTitle: "Badges",
    badgesEmpty: "Todavía no ganaste ningún badge. Se otorgan automáticamente al sincronizar.",
    insightsSectionTitle: "Insights de tu año",
    insightsEmpty: "Todavía no hay suficientes datos para generar insights de este período.",
    streakNoActive: "Sin racha activa",
    streakDaysInARow: "días seguidos, ahora mismo",
    streakRecordNow: "récord (¡es ahora!)",
    streakRecordOfPeriod: "récord del período",
    scoreLabel: "Developer Activity Score",
    scoreHowItsCalculated: "Cómo se calcula",
    scoreDimensions: {
      consistency: "Consistencia",
      volume: "Volumen",
      streak: "Rachas",
      diversity: "Diversidad"
    },
    chartNoActivity: "Sin actividad en este período todavía.",
    chartNoLanguages: "Sin datos de lenguajes todavía.",
    weekOf: "Semana de {label}",
    heatmapHoverHint: "Pasa el cursor sobre un día para ver el detalle",
    heatmapLess: "Menos",
    heatmapMore: "Más",
    monthsShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    weekdayShort: { mon: "Lun", wed: "Mié", fri: "Vie" },
    commitSingular: "commit",
    commitPlural: "commits",
    insightTypeLabels: {
      night_owl: "Night owl",
      early_bird: "Early bird",
      weekend_warrior: "Weekend warrior",
      consistent_committer: "Consistencia",
      language_loyalist: "Lenguaje favorito",
      polyglot: "Polyglot",
      mono_repo_focus: "Enfoque total",
      serial_starter: "Serial starter",
      longest_streak: "Racha récord",
      active_streak: "Racha activa"
    }
  },
  wrapped: {
    closeButton: "Cerrar",
    closeAria: "Cerrar Wrapped",
    prevAria: "Slide anterior",
    nextAria: "Siguiente slide",
    playAutoplay: "Reproducir automáticamente",
    pauseAutoplay: "Pausar",
    shareButton: "Compartir",
    notGeneratedYet: "Todavía no generaste tu Wrapped de {year}.",
    inProgress: "{year} sigue en curso — genera un adelanto con lo que llevas hasta ahora.",
    generateButton: "Generar mi Wrapped",
    generating: "Generando…",
    generateGenericError: "No se pudo generar tu Wrapped. Intenta de nuevo.",
    generatingSteps: [
      "Leyendo tus commits…",
      "Calculando tu ritmo de código…",
      "Armando el mapa de lenguajes…",
      "Redactando tus insights…",
      "Ya casi está…"
    ],
    generateSlowWarning: "Esto está tardando más de lo normal — seguimos trabajando, no hace falta que hagas nada.",
    generateCheckNow: "Revisar ahora",
    generateElapsed: "{seconds}s",
    opening: { eyebrow: "GitHub Wrapped", subtitle: "{username}, esto es lo que hiciste este año, commit a commit." },
    volume: {
      eyebrow: "Este año escribiste",
      suffix: "commits, repartidos en {activeDays} días distintos — {avgPerWeek} por semana en promedio."
    },
    rhythm: {
      eyebrow: "Tu momento más productivo",
      noPattern: "Sin un patrón claro todavía",
      days: {
        Monday: "lunes",
        Tuesday: "martes",
        Wednesday: "miércoles",
        Thursday: "jueves",
        Friday: "viernes",
        Saturday: "sábado",
        Sunday: "domingo"
      }
    },
    languages: { eyebrow: "Tu lenguaje del año" },
    repos: { eyebrow: "Tu repositorio del año", touchedPrefix: "Tocaste", touchedSuffix: "en total este año." },
    streak: { eyebrow: "Tu racha más larga", suffix: "seguidos programando" },
    closing: { eyebrow: "Eso fue {year}", writtenIn: "escritos, sobre todo, en {language}", seeYouNextYear: "Nos vemos el próximo año." },
    share: {
      title: "Compartir",
      closeAria: "Cerrar panel de compartir",
      isPublicLabel: "Tu Wrapped es público",
      isPrivateLabel: "Tu Wrapped es privado",
      isPublicDescription: "Cualquiera con el link puede verlo.",
      isPrivateDescription: "Solo tú puedes verlo.",
      makePrivate: "Hacer privado",
      makePublic: "Hacer público",
      copy: "Copiar",
      copied: "Copiado",
      shareButton: "Compartir",
      downloadSectionTitle: "Descargar esta tarjeta como imagen",
      formatStory: "Story (9:16)",
      formatPost: "Post (1:1)",
      formatTwitter: "X/Twitter (16:9)",
      downloadPng: "Descargar PNG",
      shareTitlePrefix: "Mi GitHub Wrapped"
    }
  },
  comparisons: {
    pageTitle: "Comparaciones",
    pageDescription:
      "Invita a otro usuario a comparar su actividad con la tuya. Nunca es automático — la otra persona tiene que aceptar, y cualquiera de los dos puede revocarlo después.",
    emptyList: "Todavía no tenés ninguna comparación.",
    invitedPrefix: "Invitaste a",
    invitedByPrefix: "Te invitó",
    statusPending: "Pendiente",
    statusAccepted: "Aceptada",
    statusDeclined: "Rechazada",
    viewComparison: "Ver comparación",
    accept: "Aceptar",
    cancel: "Cancelar",
    revoke: "Revocar",
    inviteInputPlaceholder: "username de GitHub",
    inviteButton: "Invitar a comparar",
    inviteSending: "Enviando…",
    inviteGenericError: "No se pudo enviar la invitación.",
    vsLabel: "vs",
    metricCommits: "Commits",
    metricActiveDays: "Días activos",
    metricLongestStreak: "Racha más larga",
    metricTopLanguage: "Lenguaje principal",
    metricActivityScore: "Activity Score",
    footerNote: "Basado en los últimos 12 meses de actividad pública de cada uno."
  }
};

export type Dictionary = typeof es;
