const HTML_VIEWS = [
    'posts-view',
    'profile-view',
    'following-posts-view'
];

document.addEventListener('DOMContentLoaded', () => {

    // Set listeners
    document.querySelector('#feed').onclick = () => loadFeed();
    document.querySelector('#profile-link').onclick = function() {
        return loadPofile(this.dataset.userId);
    };
    document.querySelector('#submit-post').onclick = (e) => submitPost(e);
    document.querySelector('#new-post-textbox').onkeyup = (e) => {
        const text = document.querySelector('#new-post-textbox').value.trim();
        if (text === '') {
            document.querySelector('#submit-post').disabled = true;
        } else {
            document.querySelector('#submit-post').disabled = false;
        }
    };
    // Pagination previous and next listeners
    document.querySelector('.page-item.previous').onclick = () => {
        const activePage = document.querySelector('.page-item.active .page-link').dataset.noPage;
        document.querySelector(`a[data-no-page="${parseInt(activePage) - 1}"]`).parentElement.click();
        return false;
    }
    document.querySelector('.page-item.next').onclick = () => {
        const activePage = document.querySelector('.page-item.active .page-link').dataset.noPage;
        document.querySelector(`a[data-no-page="${parseInt(activePage) + 1}"]`).parentElement.click();
        return false;
    }

    loadFeed();
});

function toggle_follow(operation, userId) {

    fetch(`/${operation}/${userId}`, {
        method: 'POST'
    })
        .then(res => loadPofile(userId))
        .catch(err => {
            console.log(err);
            alert(`${operation} operation was not successful.`);
        });
}

function loadPofile(userId, pageNumber=1) {
    hideAndShow('profile-view');

    const currentUserId = parseInt(document.querySelector('#profile-link').dataset.userId);
    
    // Hide follow button when visiting own profile
    if (parseInt(userId) === currentUserId) {
        document.querySelector('.btn-follow').style.display = 'none';
    }   else {
        document.querySelector('.btn-follow').style.display = 'block';
        document.querySelector('.btn-follow').dataset.userId = userId;
    }

    fetch(`/profile/${userId}?page=${pageNumber}`)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            document.querySelector('#profile-username').innerHTML = `${data.user.username}'s profile`

            document.querySelector('.following-section').innerHTML = `Following: ${data.following.length}`;
            document.querySelector('.following-section').onclick = () => {
                loadLimitedFeed(data.user, data.following.length > 0 ? false : true);
            }
            document.querySelector('.followers-section').innerHTML = `Followers: ${data.followers.length}`;
            
            // Toggle between follow and unfollow option for 'follow' button
            let notFollowed = true; 
            for (const user of data.followers) {
                if (user.id === currentUserId) {
                    document.querySelector('.btn-follow').innerHTML = 'Unfollow';
                    document.querySelector('.btn-follow').onclick = () => toggle_follow('unfollow', userId);
                    notFollowed = false;
                    break;
                }
            }
            if (notFollowed) {
                document.querySelector('.btn-follow').innerHTML = 'Follow';
                document.querySelector('.btn-follow').onclick = () => toggle_follow('follow', userId);
            }

            populateFeed('#profile-posts', data);
        });

    return false;
}

function submitPost(e) {
    e.preventDefault();
    
    const post_text = document.querySelector('#new-post-textbox').value.trim();
    
    if (post_text !== '') {
        fetch('/posts', {
            method: 'POST',
            body: JSON.stringify({
                text: post_text.trim()
            })
        })
            .then(response => response.json())
            .then(result => {
                document.querySelector('#new-post-textbox').value = '';
                if (result.error) {
                    document.querySelector('#error-message').innerHTML = result.error;
                    return;
                }
                loadFeed();
            });

    }

}

function loadFeed(pageNumber=1) {
    hideAndShow('posts-view');

    fetch(`/feed?page=${pageNumber}`)
        .then(response => response.json())
        .then(feed => {
            populateFeed('#posts-view', feed);
    });
    return false;
}

function loadLimitedFeed(user, zero_following=false, pageNumber=1) {
    if (zero_following) return;

    hideAndShow('following-posts-view');
    
    fetch(`/following-feed/${user.id}?page=${pageNumber}`)
        .then(response => response.json())
        .then(posts => {
            document.querySelector('#source-user-id').innerHTML = user.username;
            populateFeed('#following-posts-view', posts);
        });
}

function hideAndShow(toShow) {
    for (const view of HTML_VIEWS) {
        document.querySelector(`#${view}`).style.display = 'none';
        for (const item of document.querySelectorAll('.deletable')) item.remove();
    }
    document.querySelector(`#${toShow}`).style.display = 'block';
}

function populateFeed(view, feed) {

    // Create appropariate number of pagination navigation items
    if (feed.noPages < 1) {
        document.querySelector('.pagination').style.display = 'none';
    } else {
        for (let i = feed.noPages; i > 0; i--) {
            const li = document.createElement('li');
            li.classList.add('page-item', 'deletable');

            // Make current navigation page active
            if (feed.currentPage == i) {
                li.classList.add("active");
            }
            li.innerHTML = `
                <a class='page-link' href='#' data-no-page='${i}'>${i}</a>
            `;
            
            li.onclick = () =>  { loadFeed(i); }
            insertAfter(li, document.querySelector('.page-item.previous'));
        }
    }

    document.querySelector('.page-item.previous').style.display = 'block';
    document.querySelector('.page-item.next').style.display = 'block';
    if (feed.currentPage === 1) {
        document.querySelector('.page-item.previous').style.display = 'none';
    }
    if (feed.currentPage === feed.noPages) {
        document.querySelector('.page-item.next').style.display = 'none';
    }


    for (const post of feed.pageContent) {
        const div = document.createElement('div');
        div.classList.add('post-entry', 'deletable');
        div.dataset.postId = post.id;
        div.innerHTML = `
            <div class='post-entry-poster' data-user-id='${post.poster_id}'>${post.poster}</div>
            <div class='post-entry-edit-text'><span class='edit-post'>Edit</span> <span class='save-new-post'>Save</span></div>
            <div class='post-entry-text'>${post.text}</div>
            <div class='post-entry-timestamp'>${post.timestamp}</div>
            <div class='post-entry-likes'>Likes <span class='no-likes'>${post.likes.length}</span> <span class='like-post '>+1</span></div>
        `;


        for (const user of post.likes) {
            if (parseInt(document.querySelector('#profile-link').dataset.userId) === user.user_id) {
                div.querySelector('.post-entry-likes .like-post').classList.add('liked');
                break;
            }
        }

        document.querySelector(view).append(div);                
    }

    for (const item of document.querySelectorAll('.post-entry')) {
        
        // Allow users to edit their own posts only
        if (item.querySelector('.post-entry-poster').dataset.userId !== document.querySelector('#profile-link').dataset.userId) {
            item.querySelector('.post-entry-edit-text').style.display = 'none';
        }

        item.onclick = function(e) {
            const initialText = item.querySelector('.post-entry-text').textContent;
            if (e.target.className === 'edit-post') {
                editPost(this);
            }

            if (e.target.className === 'save-new-post') {
                savePost(this, initialText);
            }

            if (e.target.className === 'post-entry-poster') {
                loadPofile(e.target.dataset.userId);
            }

            if (e.target.className.includes('like-post')) {
                const likeStatus = e.target.className.includes('liked') ? true : false;
                
                likePost(this, likeStatus);
            }
        }
    }

    return true;
}

function likePost(postElem, likeStatus) {
    const currentUserId = parseInt(document.querySelector('#profile-link').dataset.userId);
    const postId = postElem.dataset.postId;
    
    fetch(`/like/${currentUserId}/${postId}`, {
        method: 'PUT'
    })
        .then(response => response.json())
        .then(result => {
            postElem.querySelector('.post-entry-likes .no-likes').innerHTML = result.noLikes;
            if (result.liked) 
                postElem.querySelector('.post-entry-likes .like-post').classList.add('liked');
            else
                postElem.querySelector('.post-entry-likes .like-post').classList.remove('liked');
        });
        
}

function editPost(postElem) {
        
    for (const button of postElem.querySelector('.post-entry-edit-text').childNodes) {
        if (button.className === 'edit-post') {
            button.style.cssText = 'pointer-events: none; color: grey;'
        }
        if (button.className === 'save-new-post') {
            button.style.display = 'initial';
        }
    }

    const textField = postElem.querySelector('.post-entry-text');
    textField.innerHTML = `<textarea>${textField.textContent}</textarea>`;
}

function savePost(postElem, initialText='') {
    // Update text in database
    const currentText = postElem.querySelector('.post-entry-text textarea').value;
    fetch('/posts', {
        method: 'PUT',
        body: JSON.stringify({
            userId: document.querySelector('#profile-link').dataset.userId,
            postUserId: postElem.querySelector('.post-entry-poster').dataset.userId,
            postId: postElem.dataset.postId,
            postText: currentText
        })
    })
        .then(response => response.json())
        .then(result => {
            
            // Update edit and save buttons
            for (const button of postElem.querySelector('.post-entry-edit-text').childNodes) {
                if (button.className === 'edit-post') {
                    button.style.cssText = 'pointer-events: initial; color: dodgerblue;'
                }
                if (button.className === 'save-new-post') {
                    button.style.display = 'none';
                }
            }
            
            // Handle error
            if (result.error) {
                alert(result.error);
                postElem.querySelector('.post-entry-text').innerHTML = initialText;
                return;
            }

            // Update post text
            postElem.querySelector('.post-entry-text').innerHTML = currentText;
        });
}

function insertAfter(newNode, referenceNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}