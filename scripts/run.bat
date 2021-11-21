setlocal
@ECHO OFF
set NODE_PATH=dist
@ECHO ON

node --trace-warnings ./dist/index.js %*
endlocal
