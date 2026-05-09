@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block; text-decoration: none;">
<span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 22px; font-weight: 700; color: {{ config('brand.accent_color', '#18181b') }}; letter-spacing: 0.5px;">
{!! trim($slot) !!}
</span>
</a>
@if (config('brand.tagline'))
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #71717a; margin-top: 4px;">
{{ config('brand.tagline') }}
</div>
@endif
</td>
</tr>
