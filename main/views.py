import json
from datetime import datetime

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.core import serializers
    
from .models import User, Post, UserFollowing


def index(request):
    print('HELLO THEERE')
    if request.user.is_authenticated:
        return render(request, "main/index.html")
    else:
        return HttpResponseRedirect(reverse('main:login'))

@csrf_exempt
@login_required
def compose(request):
    
    # Composing a new post must be via POST
    if request.method == 'PUT':
        data = json.loads(request.body)
        
        user_id = data.get('userId')
        post_user_id = data.get('postUserId')
        if user_id and post_user_id and user_id != post_user_id:
            return JsonResponse({"error": "Posts can be edited only by their owners"}, status=400)

        post = Post.objects.get(user=User.objects.get(pk=user_id), pk=data.get('postId'))
        if data.get('postText'):
            post.text = data['postText']
        post.save()
        
        return JsonResponse({"success": "Post contents were updated successfully"}, status=400)

    elif request.method != "POST":
        return JsonResponse({"error": "POST or PUT request required."}, status=400)
    
    # Check post text
    data = json.loads(request.body)
    text = data.get('text')
    if text.strip() == '':
        return JsonResponse({
            'error': 'Post cannot be empty'
        }, status=400)

    # Store post in database
    post = Post(user=request.user, text=text)
    post.save()

    return JsonResponse({
        'message': 'Post submited successfully.'
    }, status=201)

def feed(request):
    posts = (Post.objects.all()).order_by("-timestamp")
    feed = Paginator(posts, 10)

    page_number = request.GET.get('page')
    page_obj = feed.get_page(page_number)

    return JsonResponse({
        'noPages': feed.num_pages,
        'currentPage': int(page_number),
        'pageContent': [post.serialize() for post in page_obj.object_list]
    }, safe=False)

def following_feed(request, user_id):
    # Get all the accounts that the user with user_id is following
    user = User.objects.get(pk=user_id)
    
    if not user:
        return HttpResponse(status=400)
    following = user.following.all()

    # Get the posts that each of these users has made
    posts = []
    for follow in following:
        user_posts = follow.to_person.posts.order_by('timestamp').all()
        posts.append(user_posts)

    # Paginate posts
    feed = Paginator(posts, 10)

    page_number = request.GET.get('page')
    page_obj = feed.get_page(page_number)
    page_obj_temp = []
    for group in page_obj.object_list:
        for post in group:
            page_obj_temp.append(post)
    page_obj = sorted(page_obj_temp, key=lambda x: datetime.strptime(x.serialize()['timestamp'], '%b %d %Y, %I:%M %p'), reverse=True)

    # Return these posts
    return JsonResponse({
        'noPages': feed.num_pages,
        'currentPage': int(page_number),
        'pageContent': [post.serialize() for post in page_obj]
    }, safe=False)

@csrf_exempt
@login_required
def post(request):
    pass

def profile(request, user_id):
    user = User.objects.get(pk=user_id)
    following = user.following.all()
    followers = user.followers.all()

    posts = (user.posts.all()).order_by("-timestamp")

    # Paginate posts
    feed = Paginator(posts, 10)

    page_number = request.GET.get('page')
    page_obj = feed.get_page(page_number)
    
    return JsonResponse({
        'following': [user.to_person.serialize() for user in following],
        'followers': [user.from_person.serialize() for user in followers],
        'user': user.serialize(),
        'noPages': feed.num_pages,
        'currentPage': int(page_number),
        'pageContent': [post.serialize() for post in page_obj.object_list]
    }, status=200)

@csrf_exempt
@login_required
def follow(request, user_id):
    if request.method != 'POST':
        return JsonResponse({"error": "POST request required."}, status=400)
    
    if (request.user.id == user_id):
        return JsonResponse({
            'error': 'A user cannot follow himself/herself'
        }, status=400)

    to_follow = User.objects.get(pk=user_id)
    if not to_follow:
        return JsonResponse({"error": "User to follow does not exist."}, status=400)

    UserFollowing.objects.create(from_person=request.user, to_person=to_follow)

    return HttpResponse(status=204)
    
@csrf_exempt
@login_required
def unfollow(request, user_id):
    if request.method != 'POST':
        return JsonResponse({"error": "POST request required."}, status=400)

    if (request.user.id == user_id):
        return JsonResponse({
            'error': 'A user cannot unfollow himself/herself'
        }, status=400)
    
    UserFollowing.objects.filter(from_person=request.user.id, to_person=user_id).delete()

    return HttpResponse(status=204)

@csrf_exempt
@login_required
def like_post(request, user_id, post_id):

    if request.method != 'PUT':
        return JsonResponse({'error': 'PUT request required.'}, status=400)
    user = User.objects.get(pk=user_id)
    if not user:
        return JsonResponse({"error": "User does not exist."}, status=400)

    post = Post.objects.get(pk=post_id)
    if not post:
        return JsonResponse({"error": "Post to like does not exist."}, status=400)

    liked = False
    print('Current liked posts', user.posts_liked.all())
    if post in user.posts_liked.all():
        print('Removing from liked posts...')
        post.likes.remove(user)
    else:
        print('Adding to liked posts...')
        post.likes.add(user)
        liked = True

    print('Liked posts after model operation', user.posts_liked.all())
    
    return JsonResponse({
        'noLikes': len(post.likes.all()),
        'liked': liked
    }, status=200)

def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("main:index"))
        else:
            return render(request, "main/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "main/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("main:index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "main/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "main/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("main:index"))
    else:
        return render(request, "main/register.html")
