import cyberpi
import time
import socket
import ujson
import usocket
import machine
import ussl as ssl
import mbot2
import event


"""
@event.is_press('a')
def on_button_press_a():

    time.sleep(5)

    cyberpi.mbot2.drive_power(100,100)

    time.sleep(0.5)

    cyberpi.mbot2.EM_stop(port = "all")
"""


def moveForward():
    cyberpi.mbot2.EM_stop(port = "all")
    cyberpi.mbot2.drive_power(speed,-speed)
    
def moveBackwards():
    cyberpi.mbot2.EM_stop(port = "all")
    cyberpi.mbot2.drive_power(-speed,speed)


#1
"""
time.sleep(5)
cyberpi.mbot2.drive_power(100,100)
time.sleep(0.5)
cyberpi.mbot2.EM_stop(port = "all")
"""

#1/2
"""
time.sleep(5)
cyberpi.mbot2.drive_power(100,100)
time.sleep(0.27)
cyberpi.mbot2.EM_stop(port = "all")
"""

"""
time.sleep(5)
cyberpi.mbot2.drive_power(100,100)
time.sleep(0.1)
cyberpi.mbot2.EM_stop(port = "all")
"""

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
speed = 100

# UDP-Socket erstellen
udp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
udp_socket.bind(('', port))  # Binden an alle verfügbaren Schnittstellen

cyberpi.console.println('Listening (UDP)')


# Find-Mbot
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
    
# Receive Server-Message
while True:
    data, addr = udp_socket.recvfrom(1024)  # Nachricht empfangen
    
    cyberpi.console.println('Nachricht erhalten: {} : {}' .format(addr, data))
    
    # forward:0
    
    if data.decode() == "0":
        response_message = "MoveForward"
        udp_socket.sendto(response_message.encode(), (addr[0],port))  # Antwort senden  
        cyberpi.console.println('Serverip: {} ' .format(addr[0]))
        
        moveForward()

        
    elif data.decode() == "1":
        response_message = "MoveRight"
        udp_socket.sendto(response_message.encode(), (addr[0],port))  # Antwort senden  
        cyberpi.console.println('Serverip: {} ' .format(addr[0]))
        
        speed = 100
        cyberpi.mbot2.drive_power(speed, speed)
        time.sleep(0.27)
        cyberpi.mbot2.EM_stop(port = "all")
        
        moveForward()

    elif data.decode() == "2":
        response_message = "MoveBackwards"
        udp_socket.sendto(response_message.encode(), (addr[0],port))  # Antwort senden  
        cyberpi.console.println('Serverip: {} ' .format(addr[0]))
        
        moveBackwards()
        

    elif data.decode() == "3":
        response_message = "MoveLeft"
        udp_socket.sendto(response_message.encode(), (addr[0],port))  # Antwort senden  
        cyberpi.console.println('Serverip: {} ' .format(addr[0]))
        
        speed = 100
        cyberpi.mbot2.drive_power(-speed, -speed)
        time.sleep(0.27)
        cyberpi.mbot2.EM_stop(port = "all")
        
        
    elif data.decode() == "-1":
        response_message = "Stop"
        udp_socket.sendto(response_message.encode(), (addr[0],port))  # Antwort senden  
        cyberpi.console.println('Serverip: {} ' .format(addr[0]))
        
        cyberpi.mbot2.EM_stop(port = "all")

    
"""
cyberpi.mbot2.drive_power(100,0)
time.sleep(2)
cpi.mbot2.EM_stop(port = "all")

"""
        