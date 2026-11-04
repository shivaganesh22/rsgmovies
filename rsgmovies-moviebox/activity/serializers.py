from rest_framework import serializers
from activity.models import ActivityEvent


class ActivityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityEvent
        fields = [
            'id',
            'timestamp',
            'upn',
            'seedr_account_name',
            'event_type',
            'resource_type',
            'resource_id',
            'endpoint',
            'http_method',
            'status_code',
            'ip_address',
            'request_id',
            'duration_ms',
            'metadata'
        ]
        read_only_fields = fields
