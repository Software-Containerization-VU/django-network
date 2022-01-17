from django.contrib.auth.models import AbstractUser
from django.db import models

from datetime import datetime

class User(AbstractUser):
    pass

    def serialize(self):
        return {
            "id": self.id,
            "username": self.username
        }

class UserFollowing(models.Model):
    from_person = models.ForeignKey(User, on_delete=models.PROTECT, related_name='following')
    to_person = models.ForeignKey(User, on_delete=models.PROTECT, related_name='followers')

    class Meta:
        unique_together = ('from_person', 'to_person')

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='posts')
    text = models.TextField(blank=False)
    likes = models.ManyToManyField(User, blank=True, related_name="posts_liked")
    timestamp = models.DateTimeField(default=datetime.now, editable=False)

    def serialize(self):
        return {
            'id': self.id,
            'poster': self.user.username,
            'poster_id': self.user.id,
            'text': self.text,
            'likes': [{'user_id': user.id, 'username': user.username} for user in self.likes.all()],
            'timestamp': self.timestamp.strftime("%b %d %Y, %I:%M %p")
        }