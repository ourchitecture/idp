@REM ----------------------------------------------------------------------------
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@REM Apache Maven Wrapper startup batch script, version 3.2.0

@IF "%__MVNW_ARG0_NAME__%"=="" (SET "BASE_DIR=%~dp0")

@SET MAVEN_PROJECTBASEDIR=%BASE_DIR%
@IF NOT "%MAVEN_BASEDIR%"=="" (SET "MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%")

@SET PROPERTIES_FILE=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.properties

@FOR /F "usebackq tokens=1,* delims==" %%A IN (`findstr /r "^distributionUrl" "%PROPERTIES_FILE%"`) DO (
  SET "DISTRIBUTION_URL=%%B"
)

@SET MAVEN_WRAPPER_HOME=%USERPROFILE%\.m2\wrapper
@FOR %%F IN ("%DISTRIBUTION_URL%") DO SET "DIST_FILENAME=%%~nxF"
@SET "MAVEN_WRAPPER_JAR=%MAVEN_WRAPPER_HOME%\dists\%DIST_FILENAME:.zip=%"

@IF EXIST "%MAVEN_WRAPPER_JAR%\bin\mvn.cmd" (
  "%MAVEN_WRAPPER_JAR%\bin\mvn.cmd" %*
  GOTO :END
)

@ECHO Downloading Maven from %DISTRIBUTION_URL%
@SET "DIST_FILE=%MAVEN_WRAPPER_HOME%\dists\%DIST_FILENAME%"
@IF NOT EXIST "%MAVEN_WRAPPER_HOME%\dists\" (MKDIR "%MAVEN_WRAPPER_HOME%\dists\")

powershell -Command "Invoke-WebRequest -Uri '%DISTRIBUTION_URL%' -OutFile '%DIST_FILE%'"
powershell -Command "Expand-Archive -Path '%DIST_FILE%' -DestinationPath '%MAVEN_WRAPPER_HOME%\dists\' -Force"

@FOR /D %%D IN ("%MAVEN_WRAPPER_HOME%\dists\apache-maven-*") DO (
  IF NOT "%%D"=="%MAVEN_WRAPPER_JAR%" (
    REN "%%D" "%DIST_FILENAME:.zip=%"
  )
)

"%MAVEN_WRAPPER_JAR%\bin\mvn.cmd" %*

:END
