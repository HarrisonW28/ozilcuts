<?php

namespace App\Policies;

use App\Models\CustomerNote;
use App\Models\User;

class CustomerNotePolicy
{
    public function update(User $user, CustomerNote $note): bool
    {
        return $note->author_user_id === $user->id || $user->isAdmin();
    }

    public function delete(User $user, CustomerNote $note): bool
    {
        return $this->update($user, $note);
    }
}
