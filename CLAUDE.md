# CLAUDE.md

Parpadeo: comunicacion aumentativa para personas con ELA. Hackathon de 5 horas, 4 cuentas de Claude trabajando en paralelo, una por path.

## Reglas de trabajo en paralelo (obligatorias)

- **Cada path arranca con su Fase 0 (research + grill)**, descrita al principio de su issue, antes de escribir codigo. El plan de los issues es un primer approach, no definitivo: quien toma un path puede cambiarlo si lo justifica. Hallazgos en `docs/research/<path>.md`, decisiones como comentario en el issue. El issue tiene label `ready-for-human` durante la Fase 0 (necesita a la persona para el grill); al cerrarla, pasarlo a `ready-for-agent`.
- **El cimiento esta hecho pero sujeto a cambios.** Cambiar algo compartido (`src/eventos.ts`, simulador, carpetas, dependencias) se avisa al grupo antes de pushear y se deja escrito en el issue.
- **Leer `GLOSSARY.md` antes de empezar** y usar sus palabras en codigo, nombres y mensajes (usuario, interlocutor, turno, opcion, respuesta, opciones fijas, urgencia, barrido, parpadeo largo, perfil).
- **Cada cuenta trabaja en un solo path** (su issue de GitHub, label `path:*`). Tocar solo las carpetas que el issue lista como propias.
- **`src/eventos.ts` es el contrato compartido.** Preferir agregar eventos antes que renombrar o borrar; cualquier cambio, avisado.
- **`package.json`:** las dependencias base ya estan instaladas. Si un path necesita otra, avisar antes para no pisarse instalando a la vez.
- **Cada path prueba lo suyo en su pagina propia** `src/app/prueba/<path>/page.tsx`. La pagina principal `src/app/page.tsx` es solo del path nucleo-interfaz.
- **Git:** todos empujan directo a `main`, sin branches ni PRs. `git pull --rebase` antes de cada push. Commits chicos y seguidos.
- Texto de UI en espanol rioplatense con voseo.
- **Next.js 16**: puede diferir de lo que conoces. Ver `AGENTS.md` y `node_modules/next/dist/docs/` antes de usar APIs de Next.
- Correr `npx tsc --noEmit` antes de cada push: no romperle el build a los demas.

## Agent skills

### Issue tracker

Issues en GitHub Issues (`lucafassio/Twin-Garrote`) via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Labels default: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` en la raiz. See `docs/agents/domain.md`.

## graphify

Grafo del repo en `graphify-out/` (`GRAPH_REPORT.md`, `graph.json`, `graph.html`). Si tenes graphify instalado (`uv tool install graphifyy`):
- Para preguntas del codigo, primero `graphify query "<pregunta>"`; `graphify path "<A>" "<B>"` y `graphify explain "<concepto>"` para relaciones puntuales.
- Despues de cambiar codigo, `graphify update .` (solo AST, sin costo de API) y commitear `graphify-out/` junto con el cambio.
