# CLAUDE.md

Parpadeo: comunicacion aumentativa para personas con ELA. Hackathon de 5 horas, 4 cuentas de Claude trabajando en paralelo, una por path.

## Reglas de trabajo en paralelo (obligatorias)

- **Leer `GLOSSARY.md` antes de empezar** y usar sus palabras en codigo, nombres y mensajes (usuario, interlocutor, turno, opcion, respuesta, opciones fijas, urgencia, barrido, parpadeo largo, perfil).
- **Cada cuenta trabaja en un solo path** (su issue de GitHub, label `path:*`). Tocar solo las carpetas que el issue lista como propias.
- **`src/eventos.ts` es el contrato compartido.** No cambiarlo sin avisar al grupo; si hace falta un evento nuevo, agregarlo (nunca renombrar ni borrar uno existente).
- **No tocar `package.json`.** Todas las dependencias ya estan instaladas en el cimiento. Si falta algo, pedirlo al grupo.
- **Cada path prueba lo suyo en su pagina propia** `src/app/prueba/<path>/page.tsx`. La pagina principal `src/app/page.tsx` es solo del path nucleo-interfaz.
- **Git:** todos empujan directo a `main`, sin branches ni PRs. `git pull --rebase` antes de cada push. Commits chicos y seguidos.
- Texto de UI en espanol rioplatense con voseo.

## Agent skills

### Issue tracker

Issues en GitHub Issues (`lucafassio/Twin-Garrote`) via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Labels default: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` + `docs/adr/` en la raiz. See `docs/agents/domain.md`.
