---
'@wcp/wario-backend': minor
'@wcp/wario-ux-shared': minor
'@wcp/wario-fe-order': patch
'@wcp/wario-pos': patch
---

add public REST enpoints for data normally synced via socketIO.
consume the endpoints as a first sync attempt before socket data arrives

We might want to revert this if we determine this isn't the best way to get data sooner or as part of graphQL migration. The goal in making the changes was to reduce the perceived "loading time" for things like the order page or menu.
