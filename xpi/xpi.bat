@echo off
@set path="C:\Program Files\7-Zip";%path%
REM create tags first
ctags -R *
REM create the xpt then
call build-idl.bat
if exist superstart.xpi goto deletexpi



REM create xpi
: createxpi
call 7z.exe a superstart.xpi * -r -tzip -x!*.vim -x!*.bat -x!*.tmp -x!*.swp -x!*.svn -x!*.zip -x!*.git -x!*.php -x!tags -x!' -x!` -x!*.xpi -x!*.pdn -x!*.psd -x!xpi -x!*.idl -x!*.patch -x!chrome/* -x!bak.*

cd chrome
if exist superstart.jar goto deljar

REM create JAR
: createjar
call 7z.exe a superstart.jar * -r -tzip -mx0 -x!*.vim -x!*.bat -x!*.tmp -x!*.swp -x!*.svn -x!*.zip -x!*.git -x!*.php -x!tags -x!' -x!` -x!*.xpi -x!*.pdn -x!*.psd -x!xpi -x!*.idl -x!*.patch -x!test* -x!bak.*
cd ..

REM add jar into superstart
call 7z.exe a superstart.xpi chrome\superstart.jar

REM cleanup
del chrome\superstart.jar

@goto end



:deletexpi
del superstart.xpi
@goto createxpi

:deljar
del superstart.jar
@goto createjar


:xptmissing
echo IsuperstartCore.xpt is missing....
@goto end

:end
@echo on
