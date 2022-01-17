
from django.urls import path

from . import views

app_name = 'main'

urlpatterns = [
    path('', views.index, name='index'),
    path('login', views.login_view, name='login'),
    path('logout', views.logout_view, name='logout'),
    path('register', views.register, name='register'),

    # API Routes
    path('posts', views.compose, name='compose'),
    path('feed', views.feed, name='feed'),
    path('feed/<int:post>', views.post, name='post'),
    path('profile/<int:user_id>', views.profile, name='profile'),
    path('follow/<int:user_id>', views.follow, name='follow'),
    path('unfollow/<int:user_id>', views.unfollow, name='unfollow'),
    path('following-feed/<int:user_id>', views.following_feed, name='following_feed'),
    path('like/<int:user_id>/<int:post_id>', views.like_post, name='like_post')
]