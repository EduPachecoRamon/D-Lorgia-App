# Instalar v4.2 sobre tu proyecto actual

1. Haz una copia de seguridad del proyecto si quieres conservar una versión anterior.
2. Copia **todo el contenido de esta carpeta** sobre la raíz de `D-Lorgia-App`.
3. Conserva tu carpeta `.git` y cualquier `.env` privado.
4. En Supabase → SQL Editor ejecuta `supabase/v4_2_migration.sql` para activar Pulse Analytics completo.
5. Ejecuta `npm test` → debe dar **38/38**.
6. Sube a GitHub.
7. Render desplegará `main` automáticamente.
8. Abre `/admin` y realiza `Ctrl + F5` una vez.

No necesitas cambiar las cuatro variables de Supabase que ya configuraste.
