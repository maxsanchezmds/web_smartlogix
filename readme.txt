Este repo corresponde al frontend web
Despliegue AWS
--------------

El workflow `.github/workflows/ci.yml` crea previews efimeros por PR bajo `previews/pr-<numero>/` en el bucket S3 privado del frontend, servido por CloudFront. Al cerrar el PR elimina ese prefijo e invalida CloudFront.

El workflow `.github/workflows/prod-deploy.yml` publica `dist/` en el bucket S3 permanente definido por IaC y crea una invalidacion de CloudFront. Consume el contrato SSM bajo `/smartlogix/web/deploy/*`, por lo que primero debe estar aplicado el stack `iac/environments/main`.

Secrets requeridos en GitHub:

- `ACCESS_KEY`
- `ACCESS_KEY_SECRET`
