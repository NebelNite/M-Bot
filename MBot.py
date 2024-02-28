import cyberpi
import time
import socket
import ujson
import usocket
import machine
import ussl as ssl

# Set blue LED
cyberpi.led.on(0, 0, 255)

# Connect to the Wi-Fi network
cyberpi.network.config_sta("htljoh-public", "joh12345")

# Set blue LED during the connection setup
cyberpi.led.on(0, 0, 255)

# Check if connected to the Wi-Fi network
while True:
    if not cyberpi.network.is_connect():
        cyberpi.led.on(255, 0, 0)  # Red LED if not connected
        time.sleep(1)
    else:
        cyberpi.led.on(0, 255, 0)  # Green LED if connected
        sockaddr = cyberpi.network.get_ip()
        cyberpi.console.println("IP:")
        cyberpi.console.println(sockaddr)
        cyberpi.display.clear()
        break

# Set blue LED
cyberpi.led.on(0, 0, 255)

cyberpi.console.println("Connection established")

# Broadcast-Test

udp = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

udp.bind(('', 1234))
udp.setblocking(False)


while True:
    try:
        data, addr = udp.recvfrom(1024)
        if data == b'MBot2 Discovery':
            print('Broadcast request received and answered')
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s = ssl.wrap_socket(s, server_side=False, cert_reqs=ssl.CERT_NONE)
            s.connect((addr, 3500))

            s.send(b'D3')
            time.sleep(1)
            data = s.recv(1024)
            s.close()
            break
    except OSError:
        pass

    print("Waiting for broadcast request...")
    time.sleep(0.1)

udp.close()

# Get the IP address, subnet mask, and gateway
subnet = cyberpi.network.get_subnet_mark()
gateway = cyberpi.network.get_gateway()
sockaddr = cyberpi.network.get_ip()

# Create a UDP socket and bind it to the IP address and port 3500
s = usocket.socket(usocket.AF_INET, usocket.SOCK_DGRAM)
s.bind((sockaddr, 3500))

# Example usage of the socket (not provided in the original code)
# You can use the socket 's' for sending and receiving data over UDP
# For example, sending data to IP address 10.10.10.10 on port 3500:
# s.sendto(b"Hello, server!", ("10.10.10.10", 3500))

s.sendto(b"Hello, server!", (sockaddr, 3500))

# Receive data from the server
while True:
    try:
        data, addr = s.recvfrom(1024)  # Receive data with a maximum size of 1024 bytes
        received_data = ujson.loads(data)  # Decode the received JSON data
        cyberpi.console.println("Received data from the server:")
        cyberpi.console.println(received_data)
        time.sleep(5)
        # Here you can further process the received data
        # For example: Perform actions based on the received data
    except OSError as e:
        # OSError is raised if no data has been received yet
        cyberpi.console.println("No data received yet")
        pass
    except Exception as e:
        # All other exceptions are handled here
        cyberpi.console.println("Error receiving data:", str(e))
        
    
