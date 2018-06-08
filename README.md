# socket-packet
A nodejs library to wrap TCP/UDP packets between a server and client

Since you can never be sure of a data event being the full message, you may find yourself getting half packets, or even multiple packets at a time, and not being able to distinguish where a packet starts or ends.

This lib is intended to simplify this:

// TODO expand on details