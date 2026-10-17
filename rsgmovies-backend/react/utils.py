import requests
from user_agents import parse
from django.utils import timezone

class DeviceInfoManager:
    @staticmethod
    def get_device_info(request):
        user_agent_string = request.META.get('HTTP_USER_AGENT', '')
        user_agent = parse(user_agent_string)
        
        device_info = f"{user_agent.device.family}"
        if user_agent.device.brand:
            device_info += f" ({user_agent.device.brand})"
        
        browser_info = f"{user_agent.browser.family} {user_agent.browser.version_string}"
        if user_agent.os.family:
            browser_info += f" on {user_agent.os.family} {user_agent.os.version_string}"
        
        return device_info, browser_info, user_agent_string
    
    @staticmethod
    def get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @staticmethod
    def get_location_from_ip(ip):
        try:
            # Using ipapi.co for IP geolocation (free tier available)
            response = requests.get(f'https://ipapi.co/{ip}/json/', timeout=5)
            if response.status_code == 200:
                data = response.json()
                city = data.get('city', '')
                region = data.get('region', '')
                country = data.get('country_name', '')
                location_parts = [part for part in [city, region, country] if part]
                return ', '.join(location_parts) if location_parts else "Unknown"
        except:
            pass
        return "Unknown"