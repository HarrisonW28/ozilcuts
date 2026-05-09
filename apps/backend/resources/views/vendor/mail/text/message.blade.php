<x-mail::layout>
    {{-- Header --}}
    <x-slot:header>
        <x-mail::header :url="config('brand.website_url', config('app.url'))">
            {{ config('brand.name', config('app.name')) }}
        </x-mail::header>
    </x-slot:header>

    {{-- Body --}}
    {{ $slot }}

    {{-- Subcopy --}}
    @isset($subcopy)
        <x-slot:subcopy>
            <x-mail::subcopy>
                {{ $subcopy }}
            </x-mail::subcopy>
        </x-slot:subcopy>
    @endisset

    {{-- Footer --}}
    <x-slot:footer>
        <x-mail::footer>
@php
$brandName = config('brand.name', config('app.name'));
$brandAddress = (string) config('brand.address', '');
$supportEmail = (string) config('brand.support_email', '');
$prefsUrl = rtrim((string) config('brand.website_url'), '/').'/profile/notifications';
@endphp
© {{ date('Y') }} {{ $brandName }}. @lang('All rights reserved.')
@if ($brandAddress !== '')

{{ $brandAddress }}
@endif
@if ($supportEmail !== '')

Need help? {{ $supportEmail }}
@endif

Manage your email preferences: {{ $prefsUrl }}
        </x-mail::footer>
    </x-slot:footer>
</x-mail::layout>
