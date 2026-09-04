Dim scriptDir, WshShell
scriptDir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\"))
Set WshShell = CreateObject("WScript.Shell")
' WindowStyle = 0: ẩn hoàn toàn, không flash CMD
WshShell.Run "python """ & scriptDir & "server.py""", 0, False
