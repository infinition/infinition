---
title: Responder
weight: "10"

---
!\[\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image002.gif =206x33)[!\[GitHub Pages Logo (Page 1) - Line.17QQ.com\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image004.jpg =80x80)](https://github.com/SpiderLabs/Responder)RESPONDER

| --- |
|  |
|  |  |

![](/uploads/skull.png)**WHAT is responder ?**

How to use Responder to capture NetNTLM and grab a shell | A2Secure

Responder is a tool with different capabilities but the most interesting is the possibility of setting up a rogue samba server and steal NetNTLM hashes.

Ä **Overview & Tools**

In order to be able to complete this task, it is good practice to start the responder in analyzing mode with the option -A.

!\[Rectangle : coins arrondis: root@kali:# python Responder.py -I eth0 -A\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image007.gif =597x37)

This way we are able to get an overview of the normal traffic of the network and see if there are any NACs (Network Access Controls). From this point we can easily exclude them by modifying the Responder.conf putting their IP on the voice DontRespondTo. Otherwise, if we want to target specific IP instead, we would have to insert them into the voice RespondTo.

Now we are ready to capture some hashes with the following command:

!\[Rectangle : coins arrondis: root@kali:# python Responder.py -I eth0

\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image008.gif =597x36)

When a client tries to resolve a name not in the DNS, Responder will poison the LLMNR

(Link-Local Multicast Name Resolution), NBT-NS (NetBIOS Name Service) and spoof SMB Request in order to grab NetNTLMv2 hash.

!\[\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image010.jpg =502x140)

Once the hash has been obtained, we can proceed cracking it or we can relay it to another machine. I like cracking passwords, so…

To crack the hash, we can use Hashcat, a tool for password recovery. We run:

!\[Rectangle : coins arrondis: root@kali:# hashcat -m 5600 hash.txt rockyou.txt;\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image011.gif =597x37)

where -m is used to specify the type of hash that we want to crack, hash.txt is our hash and rockyou.txt is our dictionary.

!\[responder-to-capture-netntml_2\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image013.jpg =594x150)

We can use the credentials obtained to spawn a shell using psexec (a tool from impackt) with the command:

!\[Rectangle : coins arrondis: root@kali:# python psexec.py ‘Jackie Chan’:noodles@192.168.1.172\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image014.gif =597x36)

!\[responder-to-capture-netntml_3\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image016.jpg =593x184)

We can also use Responder for another attack that allows us to poison the WPAD request. In a company network a proxy is usually used to reach out to the internet network. But how can a computer knows which proxy is used? To solve this problem a computer automatically searches for WPAD (Web Proxy Auto Discovery) server.

What Responder does with the command python Responder.py -I eth0 -wFr is to create a fake WPAD server and so it responds to the client with its IP. Then, when the client tries to get the wpad.dat, Responder creates an authentication screen asking the client to enter username and password used in the domain. The credentials are showed in the terminal in plaintext.

!\[responder-to-capture-netntml_4\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image018.jpg =594x414)

!\[responder-to-capture-netntml_5\](file:///C:/Users/NEPHYS\~1/AppData/Local/Temp/msohtmlclip1/01/clip_image020.jpg =594x180)

Ä **Prevention & remediation**

To avoid this kind of attacks a good method is to enable SMB Signing, disable NBNS and LLMNR broadcast and create a WPAD entry which points to the corporate proxy.