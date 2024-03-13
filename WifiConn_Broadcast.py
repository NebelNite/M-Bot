import cyberpi
import time
import socket
import ujson
import usocket
import machine
import ussl as ssl



# Blue
cyberpi.led.on(0, 0, 255)

# Connect to Wi-Fi
cyberpi.network.config_sta("htljoh-public", "joh12345")


# Check if connected to the Wi-Fi network
while True:
    if not cyberpi.network.is_connect():
        cyberpi.led.on(255, 0, 0)  # Red
        time.sleep(1)
    else:
        cyberpi.led.on(0, 255, 0)  # Green
        sockaddr = cyberpi.network.get_ip()
        cyberpi.console.println("IP:")
        cyberpi.console.println(sockaddr)
        
        
        """cyberpi.display.clear()"""
        break
    
"""
cyberpi.console.println("Connection established")
"""

subnet = cyberpi.network.get_subnet_mark()
gateway = cyberpi.network.get_gateway()
sockaddr = cyberpi.network.get_ip()


port=12345

# UDP-Socket erstellen
udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp_socket.bind(('', port))  # Binden an alle verfügbaren Schnittstellen

cyberpi.console.println('Listening (UDP)')


while True:
    data, addr = udp_socket.recvfrom(1024)  # Nachricht empfangen
    
    cyberpi.console.println('Nachricht erhalten: {} : {}' .format(addr, data))
    
    # Hier kannst du auf die Nachricht reagieren und eine Antwort senden
    if data.decode() == "MBotDiscovery":
        response_message = "MBotDiscovered"
        # addr[0] = Server IP
        udp_socket.sendto(response_message.encode(), (addr[0],port))  # Antwort senden  
        cyberpi.console.println('Serverip: {} ' .format(addr[0]))
    elif data.decode() == "Connected to Server":
        cyberpi.console.println('Connected to server!')
        break
        
cyberpi.mbot2.drive_power(100,100)
time.sleep(2)

        