from rest_framework import serializers
from react.models import Contact


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'full_name', 'email', 'subject', 'message', 'created_at']
        read_only_fields = ['id', 'created_at']


class PlayerSerializer(serializers.Serializer):
    id = serializers.CharField()
    num = serializers.CharField()
    type = serializers.CharField()
    