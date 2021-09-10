setlocal
@ECHO OFF
set NODE_PATH=dist
@ECHO ON

node --inspect ./dist/index.js
endlocal