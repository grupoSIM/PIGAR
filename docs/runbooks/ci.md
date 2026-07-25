# CI de calidad

El workflow `.github/workflows/ci.yml` usa GitHub Actions en `push` a `main` y en cada pull request. No contiene secretos, SSH ni pasos de despliegue.

Ejecuta instalación reproducible con `pnpm install --frozen-lockfile --ignore-scripts`, seguido por formato, lint, typecheck, pruebas unitarias, integración, seguridad, E2E y la meta-prueba `pnpm test:ci-contract`.

La meta-prueba comprueba que el workflow conserva todas las categorías y demuestra localmente que regresiones controladas de formato, lint, tipos y suites detienen el proceso. El primer run remoto ocurrirá al publicar el repositorio; un futuro workflow de Hostinger deberá ser independiente, requerir aprobación manual y recibir sus secretos solo desde GitHub Actions.
