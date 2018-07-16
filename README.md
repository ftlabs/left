# LeFT

An exploration of recent, impressive, nay amazing, progress in automated translation services.

This [dashboard (behind SSO)](https://ftlabs-left.herokuapp.com/) lets us have a play with the translations on FT content.

## Local Build, Run

```
$ git clone THIS_REPO_URL
$ cd left
$ vi .env                  # specify all the config vars (see below)
$ npm install
$ npm run start
```

## Configure (via the .env file, or environment params)

```
ALLOWED_USERS=...          # a CSV of those who can see the extra goodies
PUBLIC_TRANSLATORS=...     # a CSV, e.g. deepl
RESTRICTED_TRANSLATORS=... # a CSV, e.g. amz,google
FT_API_KEY=...             # for FT article content
LEXICON_API_KEY=...        # for FT Lexicon content
DEEPL_API_KEY=...          # for Deepl access
GOOGLE_PROJECT_ID=...      # for Google access
GOOGLE_CREDS={"...         # ditto, a JSON-encoded string of the keyfile
AWS_ACCESS_KEY_ID=...      # for AWS access
AWS_REGION=...             # ditto
AWS_SECRET_ACCESS_KEY=...  # ditto
AUDIO_RENDER_URL=...       # for generating the audio version of the translations
AUDIO_RENDER_TOKEN=...     # ditto (lifted from the renderer's settings)
```
