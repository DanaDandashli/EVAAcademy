from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Avatar, User as UserModel, StudentProfile

User = get_user_model()


class AvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avatar
        fields = "__all__"


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    avatar = serializers.PrimaryKeyRelatedField(queryset=Avatar.objects.all(), required=False, allow_null=True, default=None)
    age_group = serializers.ChoiceField(
        choices=UserModel.AgeGroupChoices.choices)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "age",
            "age_group",
            "gender",
            "role",
            "avatar",
        ]

    def create(self, validated_data):
        is_child = validated_data.get('age_group') == 'child'
        password = validated_data["password"]
        # pop avatar so it doesn't conflict — default is None if not sent or null
        avatar = validated_data.pop("avatar", None)

        if is_child:
            # Create without password first to bypass validators, then set PIN directly
            user = User(
                username=validated_data["username"],
                age=validated_data.get("age"),
                age_group=validated_data.get("age_group"),
                gender=validated_data.get("gender"),
                role=validated_data.get("role"),
                avatar=avatar,
            )
            user.set_password(password)  # hashes without running validators
            user.save()
        else:
            user = User.objects.create_user(
                username=validated_data["username"],
                email=validated_data.get("email"),
                password=password,
                age=validated_data.get("age"),
                age_group=validated_data.get("age_group"),
                gender=validated_data.get("gender"),
                role=validated_data.get("role"),
                avatar=avatar,
            )
            StudentProfile.objects.get_or_create(user=user)
        return user
    

class StudentProfileSerializer(serializers.Serializer):
    xp_total = serializers.IntegerField()
    level = serializers.IntegerField()
    elo_rating = serializers.IntegerField()
    learning_speed = serializers.FloatField()
    status = serializers.CharField()


class MeSerializer(serializers.ModelSerializer):
    """Full profile for the dashboard — user + student profile + avatar image."""
    student_profile = StudentProfileSerializer(read_only=True)
    avatar_image = serializers.SerializerMethodField()
    avatar_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'age',
            'age_group',
            'gender',
            'role',
            'avatar_image',
            'avatar_name',
            'student_profile',
        ]

    def get_avatar_image(self, obj):
        request = self.context.get('request')
        if obj.avatar and obj.avatar.image:
            url = obj.avatar.image.url
            return request.build_absolute_uri(url) if request else url
        return None

    def get_avatar_name(self, obj):
        return obj.avatar.name if obj.avatar else None
