// Borra de EAS la copia guardada del perfil de Apple de la app (05/11/2026).
//
// EAS guarda una copia del perfil de aprovisionamiento y la reutiliza en cada
// compilación sin volver a mirar Apple. La del 14/09/2026 es de antes de que la
// app usara avisos push, y Apple rechaza la compilación: «doesn't include the
// Push Notifications capability». Regenerarlo en la web de Apple no basta,
// porque EAS sigue con su copia. Sin copia, la compilación interactiva crea un
// perfil nuevo con la llave de App Store Connect, ya con los avisos.
//
// Solo toca el perfil de App Store de `com.veciyo.app`. El certificado de
// distribución se queda.
//
// Uso: EXPO_TOKEN=… node .github/scripts/olvidar-perfil-ios.mjs
const PROYECTO = "@nocodehero/veci";
const IDENTIFICADOR = "com.veciyo.app";
const token = process.env.EXPO_TOKEN;
if (!token) throw new Error("Falta EXPO_TOKEN");

async function pedir(query, variables) {
  const r = await fetch("https://api.expo.dev/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
  });
  const cuerpo = await r.json();
  if (cuerpo.errors?.length) throw new Error(JSON.stringify(cuerpo.errors));
  return cuerpo.data;
}

const datos = await pedir(
  `query ($nombre: String!) {
    app { byFullName(fullName: $nombre) {
      iosAppCredentials {
        appleAppIdentifier { bundleIdentifier }
        iosAppBuildCredentialsList(filter: { iosDistributionType: APP_STORE }) {
          id
          provisioningProfile { id developerPortalIdentifier expiration }
        }
      }
    } }
  }`,
  { nombre: PROYECTO },
);

const perfiles = datos.app.byFullName.iosAppCredentials
  .filter((c) => c.appleAppIdentifier.bundleIdentifier === IDENTIFICADOR)
  .flatMap((c) => c.iosAppBuildCredentialsList)
  .map((b) => b.provisioningProfile)
  .filter(Boolean);

if (perfiles.length === 0) {
  console.log(`No hay perfil guardado para ${IDENTIFICADOR}: nada que borrar.`);
} else {
  for (const p of perfiles) {
    console.log(`Perfil guardado: ${p.developerPortalIdentifier}, vence ${p.expiration}`);
  }
  await pedir(
    `mutation ($ids: [ID!]!) {
      appleProvisioningProfile { deleteAppleProvisioningProfiles(ids: $ids) { id } }
    }`,
    { ids: perfiles.map((p) => p.id) },
  );
  console.log(`Borrada la copia de ${perfiles.length} perfil(es). EAS creará uno nuevo.`);
}
