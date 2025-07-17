// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PostContract {
    struct Post {
        uint id;
        address author;
        string contentHash; // IPFS hash
        uint timestamp;
    }

    uint public postCount = 0;
    mapping(uint => Post) public posts;
    IERC20 public socialToken;

    // Follow system mappings
    mapping(address => mapping(address => bool)) public isFollowing;
    mapping(address => address[]) public followingList;
    // 🧾 Bio mapping
    mapping(address => string) public bios;
    // Username mappings
    mapping(address => string) public usernames;
    mapping(string => address) public usernameToAddress;

    // Like system mappings
    mapping(uint => mapping(address => bool)) public postLikes; // postId => user => liked
    mapping(uint => uint) public postLikeCount; // postId => like count
    mapping(address => uint[]) public userLikedPosts; // user => array of post IDs they liked

    // Events
    event NewPost(uint id, address author, string contentHash, uint timestamp);
    event TipSent(address indexed from, address indexed to, uint amount, uint postId);
    event UserFollowed(address indexed follower, address indexed followed);
    event UserUnfollowed(address indexed follower, address indexed unfollowed);
    event UsernameSet(address indexed user, string username);
    event PostLiked(uint indexed postId, address indexed user);
    event PostUnliked(uint indexed postId, address indexed user);

    constructor(address _tokenAddress) {
        socialToken = IERC20(_tokenAddress);
    }

    function createPost(string memory _contentHash) public {
        postCount++;
        posts[postCount] = Post(postCount, msg.sender, _contentHash, block.timestamp);
        emit NewPost(postCount, msg.sender, _contentHash, block.timestamp);
    }

    function tipPostAuthor(uint _postId, uint _amount) public {
        require(_postId > 0 && _postId <= postCount, "Invalid post ID");
        Post memory post = posts[_postId];
        require(post.author != address(0), "Post has no author");
        
        // Transfer SOC tokens from tipper to post author
        require(socialToken.transferFrom(msg.sender, post.author, _amount), "Token transfer failed");
        emit TipSent(msg.sender, post.author, _amount, _postId);
    }

    // Follow system functions
    function follow(address user) external {
        require(user != msg.sender, "Cannot follow yourself");
        require(!isFollowing[msg.sender][user], "Already following");
        
        isFollowing[msg.sender][user] = true;
        followingList[msg.sender].push(user);
        
        emit UserFollowed(msg.sender, user);
    }

    function unfollow(address user) external {
        require(isFollowing[msg.sender][user], "Not following");
        
        isFollowing[msg.sender][user] = false;
        
        // Remove from following list
        address[] storage list = followingList[msg.sender];
        for (uint i = 0; i < list.length; i++) {
            if (list[i] == user) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }
        
        emit UserUnfollowed(msg.sender, user);
    }

    function getFollowing(address user) external view returns (address[] memory) {
        return followingList[user];
    }

    function getFollowingCount(address user) external view returns (uint256) {
        return followingList[user].length;
    }

    // Helper function to check if posts should be shown in following feed
    function isPostFromFollowing(uint _postId, address _user) external view returns (bool) {
        require(_postId > 0 && _postId <= postCount, "Invalid post ID");
        Post memory post = posts[_postId];
        return isFollowing[_user][post.author];
    }

    // Get all posts from users that the caller is following
    function getFollowingPosts(address _user) external view returns (uint[] memory) {
        uint[] memory followingPosts = new uint[](postCount);
        uint followingPostCount = 0;
        
        for (uint i = 1; i <= postCount; i++) {
            if (isFollowing[_user][posts[i].author]) {
                followingPosts[followingPostCount] = i;
                followingPostCount++;
            }
        }
        
        // Resize array to actual size
        uint[] memory result = new uint[](followingPostCount);
        for (uint i = 0; i < followingPostCount; i++) {
            result[i] = followingPosts[i];
        }
        
        return result;
    }

    // 🔧 Set bio function
    function setBio(string memory newBio) public {
        bios[msg.sender] = newBio;
    }

    // 🔧 Set username function
    function setUsername(string calldata name) public {
        require(bytes(name).length > 0, "Username required");
        require(usernameToAddress[name] == address(0) || usernameToAddress[name] == msg.sender, "Username taken");
        string memory current = usernames[msg.sender];
        if (bytes(current).length > 0) {
            usernameToAddress[current] = address(0);
        }
        usernames[msg.sender] = name;
        usernameToAddress[name] = msg.sender;
        emit UsernameSet(msg.sender, name);
    }

    // Like system functions
    function likePost(uint _postId) public {
        require(_postId > 0 && _postId <= postCount, "Invalid post ID");
        require(!postLikes[_postId][msg.sender], "Already liked");
        
        postLikes[_postId][msg.sender] = true;
        postLikeCount[_postId]++;
        userLikedPosts[msg.sender].push(_postId);
        
        emit PostLiked(_postId, msg.sender);
    }

    function unlikePost(uint _postId) public {
        require(_postId > 0 && _postId <= postCount, "Invalid post ID");
        require(postLikes[_postId][msg.sender], "Not liked");
        
        postLikes[_postId][msg.sender] = false;
        postLikeCount[_postId]--;
        
        // Remove from user's liked posts array
        uint[] storage likedPosts = userLikedPosts[msg.sender];
        for (uint i = 0; i < likedPosts.length; i++) {
            if (likedPosts[i] == _postId) {
                likedPosts[i] = likedPosts[likedPosts.length - 1];
                likedPosts.pop();
                break;
            }
        }
        
        emit PostUnliked(_postId, msg.sender);
    }

    function isLiked(uint _postId, address _user) public view returns (bool) {
        return postLikes[_postId][_user];
    }

    function getLikedPosts(address _user) public view returns (uint[] memory) {
        return userLikedPosts[_user];
    }
}