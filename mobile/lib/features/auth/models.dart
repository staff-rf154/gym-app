class TokenResponse {
  const TokenResponse({
    required this.accessToken,
    required this.refreshToken,
    required this.role,
    required this.userId,
  });

  factory TokenResponse.fromJson(Map<String, dynamic> json) {
    return TokenResponse(
      accessToken: json['access_token'] as String,
      refreshToken: json['refresh_token'] as String,
      role: json['role'] as String,
      userId: json['user_id'] as String,
    );
  }

  final String accessToken;
  final String refreshToken;
  final String role;
  final String userId;
}

class UserProfile {
  const UserProfile({
    required this.userId,
    required this.role,
    required this.name,
    required this.phone,
    required this.timezone,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: json['user_id'] as String,
      role: json['role'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      timezone: json['timezone'] as String,
    );
  }

  final String userId;
  final String role;
  final String name;
  final String phone;
  final String timezone;
}
