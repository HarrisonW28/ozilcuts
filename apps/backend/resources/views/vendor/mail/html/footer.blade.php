<tr>
<td>
<table class="footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td class="content-cell" align="center">
{{ Illuminate\Mail\Markdown::parse($slot) }}
@if (config('brand.address') || config('brand.support_email'))
<p style="font-size: 12px; color: #71717a; margin-top: 12px;">
@if (config('brand.address'))
{!! nl2br(e(config('brand.address'))) !!}<br>
@endif
@if (config('brand.support_email'))
Need help? <a href="mailto:{{ config('brand.support_email') }}" style="color: {{ config('brand.accent_color', '#18181b') }};">{{ config('brand.support_email') }}</a>
@endif
</p>
<p style="font-size: 12px; color: #71717a; margin-top: 4px;">
You're receiving this because you have an account with {{ config('brand.name', 'Ozilcuts') }}. <a href="{{ rtrim((string) config('brand.website_url'), '/') }}/profile/notifications" style="color: {{ config('brand.accent_color', '#18181b') }};">Manage notification preferences</a>.
</p>
@endif
</td>
</tr>
</table>
</td>
</tr>
