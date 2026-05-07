<?php

use App\Http\Controllers\Api\V1\AppointmentIndexController;
use App\Http\Controllers\Api\V1\AppointmentStoreController;
use App\Http\Controllers\Api\V1\Auth\GoogleOAuthCallbackController;
use App\Http\Controllers\Api\V1\Auth\GoogleOAuthRedirectController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\BarberAvailabilityManageReplaceController;
use App\Http\Controllers\Api\V1\BarberAvailabilityManageShowController;
use App\Http\Controllers\Api\V1\BarberAvailabilityPublicController;
use App\Http\Controllers\Api\V1\BarberIndexController;
use App\Http\Controllers\Api\V1\BarberManageIndexController;
use App\Http\Controllers\Api\V1\BarberManageStoreController;
use App\Http\Controllers\Api\V1\BarberManageUpdateController;
use App\Http\Controllers\Api\V1\BarberShowController;
use App\Http\Controllers\Api\V1\BarberSlotsController;
use App\Http\Controllers\Api\V1\CurrentUserController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\ServiceIndexController;
use App\Http\Controllers\Api\V1\ServiceManageDestroyController;
use App\Http\Controllers\Api\V1\ServiceManageIndexController;
use App\Http\Controllers\Api\V1\ServiceManageStoreController;
use App\Http\Controllers\Api\V1\ServiceManageUpdateController;
use App\Http\Controllers\Api\V1\UserIndexController;
use App\Http\Controllers\Api\V1\UserShowController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::get('/services', ServiceIndexController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers', BarberIndexController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers/{user}', BarberShowController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers/{user}/availability', BarberAvailabilityPublicController::class)
    ->middleware('throttle:60,1');
Route::get('/barbers/{user}/slots', BarberSlotsController::class)
    ->middleware('throttle:60,1');

Route::post('/auth/register', RegisterController::class)
    ->middleware('throttle:10,1');
Route::post('/auth/login', LoginController::class)
    ->middleware('throttle:10,1');

Route::get('/auth/google/redirect', GoogleOAuthRedirectController::class)
    ->middleware('throttle:20,1');
Route::get('/auth/google/callback', GoogleOAuthCallbackController::class)
    ->middleware('throttle:20,1');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', CurrentUserController::class);
    Route::post('/auth/logout', LogoutController::class);
    Route::get('/users', UserIndexController::class);
    Route::get('/users/{user}', UserShowController::class);
    Route::get('/manage/barbers', BarberManageIndexController::class);
    Route::post('/manage/barbers', BarberManageStoreController::class)
        ->middleware('throttle:20,1');
    Route::patch('/manage/barbers/{user}/profile', BarberManageUpdateController::class)
        ->middleware('throttle:30,1');
    Route::get('/manage/barbers/{user}/availability', BarberAvailabilityManageShowController::class);
    Route::put('/manage/barbers/{user}/availability', BarberAvailabilityManageReplaceController::class)
        ->middleware('throttle:30,1');
    Route::get('/manage/services', ServiceManageIndexController::class);
    Route::post('/manage/services', ServiceManageStoreController::class)
        ->middleware('throttle:30,1');
    Route::patch('/manage/services/{service}', ServiceManageUpdateController::class)
        ->middleware('throttle:30,1');
    Route::delete('/manage/services/{service}', ServiceManageDestroyController::class)
        ->middleware('throttle:30,1');
    Route::get('/appointments', AppointmentIndexController::class);
    Route::post('/appointments', AppointmentStoreController::class)
        ->middleware('throttle:20,1');
});
