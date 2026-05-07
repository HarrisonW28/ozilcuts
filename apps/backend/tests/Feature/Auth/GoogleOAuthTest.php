<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Contracts\User as SocialiteUserContract;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class GoogleOAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_google_redirect_returns_redirect_when_configured(): void
    {
        $response = $this->get('/api/v1/auth/google/redirect');

        $response->assertRedirect();

        $location = $response->headers->get('Location') ?? '';
        $this->assertStringContainsString('accounts.google.com', $location);
    }

    public function test_google_redirect_returns_503_when_not_configured(): void
    {
        Config::set('services.google.client_id', '');
        Config::set('services.google.client_secret', '');

        $this->get('/api/v1/auth/google/redirect')->assertStatus(503);
    }

    public function test_google_callback_creates_user_and_redirects_with_token(): void
    {
        $social = Mockery::mock(SocialiteUserContract::class);
        $social->shouldReceive('getId')->andReturn('google-subject-1');
        $social->shouldReceive('getEmail')->andReturn('new-oauth@example.com');
        $social->shouldReceive('getName')->andReturn('OAuth Name');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($social);

        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $response = $this->get('/api/v1/auth/google/callback');

        $response->assertRedirect();
        $location = $response->headers->get('Location') ?? '';
        $this->assertStringStartsWith('http://frontend.test/auth/callback#', $location);
        $this->assertStringContainsString('token=', $location);

        $this->assertDatabaseHas('users', [
            'email' => 'new-oauth@example.com',
            'provider' => 'google',
            'provider_id' => 'google-subject-1',
        ]);
    }

    public function test_google_callback_links_existing_email_only_account(): void
    {
        $existing = User::factory()->create([
            'email' => 'merge@example.com',
            'provider' => null,
            'provider_id' => null,
        ]);

        $social = Mockery::mock(SocialiteUserContract::class);
        $social->shouldReceive('getId')->andReturn('google-merge-1');
        $social->shouldReceive('getEmail')->andReturn('merge@example.com');
        $social->shouldReceive('getName')->andReturn('Merged Name');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($social);

        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $this->get('/api/v1/auth/google/callback')->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $existing->id,
            'email' => 'merge@example.com',
            'provider' => 'google',
            'provider_id' => 'google-merge-1',
            'name' => 'Merged Name',
        ]);
    }

    public function test_google_callback_redirects_on_account_conflict(): void
    {
        User::factory()->create([
            'email' => 'conflict@example.com',
            'provider' => 'google',
            'provider_id' => 'existing-google-id',
        ]);

        $social = Mockery::mock(SocialiteUserContract::class);
        $social->shouldReceive('getId')->andReturn('different-google-id');
        $social->shouldReceive('getEmail')->andReturn('conflict@example.com');
        $social->shouldReceive('getName')->andReturn('Other');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('stateless')->once()->andReturnSelf();
        $provider->shouldReceive('user')->once()->andReturn($social);

        Socialite::shouldReceive('driver')->once()->with('google')->andReturn($provider);

        $response = $this->get('/api/v1/auth/google/callback');

        $response->assertRedirect();
        $location = $response->headers->get('Location') ?? '';
        $this->assertStringContainsString('error=account_conflict', $location);
    }
}
