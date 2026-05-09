<x-mail::message>
# Welcome to {{ $brandName }}, {{ $user->name }}

Thanks for signing up. You're all set to book a slot whenever you need a sharp cut.

Here's what you can do next:

- **Browse services** and pick the one that suits you
- **Choose your barber** (or let us match you)
- **Lock in a time** that works for your week

<x-mail::button :url="$bookUrl">
Book your first appointment
</x-mail::button>

You can review your details and notification preferences from your profile any time.

<x-mail::button :url="$profileUrl" color="primary">
Visit your profile
</x-mail::button>

— {{ $brandName }}
</x-mail::message>
