from django.contrib import admin
from django import forms
from seedr_service.models import SeedrAccount


class SeedrAccountForm(forms.ModelForm):
    raw_password = forms.CharField(
        widget=forms.PasswordInput(render_value=False),
        required=False,
        label="Password",
        help_text="Leave blank to keep existing encrypted password. Enter new password to update."
    )

    class Meta:
        model = SeedrAccount
        fields = ['name', 'username', 'raw_password', 'status', 'is_default', 'last_error']

    def save(self, commit=True):
        instance = super().save(commit=False)
        raw_password = self.cleaned_data.get('raw_password')
        if raw_password:
            instance.password = raw_password
        if commit:
            instance.save()
        return instance


@admin.register(SeedrAccount)
class SeedrAccountAdmin(admin.ModelAdmin):
    form = SeedrAccountForm
    list_display = ('name', 'username', 'status', 'is_default', 'last_authenticated', 'updated_at')
    list_filter = ('status', 'is_default')
    search_fields = ('name', 'username')
    readonly_fields = ('last_authenticated', 'created_at', 'updated_at')
