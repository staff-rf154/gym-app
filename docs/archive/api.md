```yaml
openapi: 3.1.0
info:
  title: Gym MVP API
  version: 1.1.0
  description: |
    API спортивного зала: админ (web), тренер (mobile), клиент (mobile).
    Часовой пояс по умолчанию Asia/Novosibirsk, у каждого User своё поле timezone.
    Все DateTime — ISO 8601 UTC. Workout.date — календарная дата (без времени).

    Жизненный цикл тренировки: PLANNED → IN_PROGRESS → DONE; SKIPPED — пропущена.
    Начать можно только из PLANNED, завершить — только из IN_PROGRESS; повторный
    start/finish возвращает 409. Статус общий для тренера и клиента: кто первый
    выполнил переход, тот и меняет состояние. После DONE/SKIPPED результаты
    (WorkoutItemResult) неизменяемы: PUT результата и изменение тренировки
    возвращают 409 для всех ролей.

servers:
  - url: http://localhost:8080/api/v1

security:
  - bearerAuth: []

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      properties:
        statusCode: { type: integer }
        message: { type: string }
        error: { type: string }

    Role:
      type: string
      enum: [ADMIN, RECEPTION, TRAINER, CLIENT]

    Gender:
      type: string
      enum: [MALE, FEMALE, OTHER]

    EquipmentType:
      type: string
      enum: [MACHINE, FREE_WEIGHT, CARDIO, OTHER]

    WorkoutStatus:
      type: string
      enum: [PLANNED, IN_PROGRESS, DONE, SKIPPED]

    NutritionType:
      type: string
      enum: [DAILY, POST_WORKOUT]

    ChatType:
      type: string
      enum: [CLIENT_TRAINER, CLIENT_ADMIN, TRAINER_ADMIN]

    LoginRequest:
      type: object
      required: [phone, password]
      properties:
        phone: { type: string, example: "+79001234567" }
        password: { type: string, format: password }

    TokenResponse:
      type: object
      properties:
        access_token: { type: string }
        refresh_token: { type: string }
        role: { $ref: '#/components/schemas/Role' }
        user_id: { type: string, format: uuid }

    RefreshRequest:
      type: object
      required: [refresh_token]
      properties:
        refresh_token: { type: string }

    MeResponse:
      type: object
      properties:
        user_id: { type: string, format: uuid }
        role: { $ref: '#/components/schemas/Role' }
        name: { type: string }
        phone: { type: string }
        timezone: { type: string, example: "Asia/Novosibirsk" }

    UpdateTimezoneRequest:
      type: object
      required: [timezone]
      properties:
        timezone: { type: string, example: "Europe/Moscow" }

    UpdatePushTokenRequest:
      type: object
      required: [token]
      properties:
        token: { type: string, example: "fcm-registration-token" }

    Gym:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        address: { type: string }
        isActive: { type: boolean }

    CreateGymRequest:
      type: object
      required: [name, address]
      properties:
        name: { type: string }
        address: { type: string }
        isActive: { type: boolean }

    GymEquipment:
      type: object
      properties:
        id: { type: string, format: uuid }
        gymId: { type: string, format: uuid }
        name: { type: string }
        type: { $ref: '#/components/schemas/EquipmentType' }
        minWeight: { type: number, nullable: true }
        maxWeight: { type: number, nullable: true }
        photoUrl: { type: string, nullable: true }
        description: { type: string, nullable: true }

    CreateEquipmentRequest:
      type: object
      required: [name, type]
      properties:
        name: { type: string }
        type: { $ref: '#/components/schemas/EquipmentType' }
        minWeight: { type: number, nullable: true }
        maxWeight: { type: number, nullable: true }
        photoUrl: { type: string, nullable: true }
        description: { type: string, nullable: true }

    Exercise:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        type: { $ref: '#/components/schemas/EquipmentType' }
        muscleGroup: { type: string, nullable: true }
        requiresEquipment: { type: boolean }
        videoUrl: { type: string, nullable: true }
        description: { type: string, nullable: true }

    CreateExerciseRequest:
      type: object
      required: [name, type, requiresEquipment]
      properties:
        name: { type: string }
        type: { $ref: '#/components/schemas/EquipmentType' }
        muscleGroup: { type: string, nullable: true }
        requiresEquipment: { type: boolean }
        videoUrl: { type: string, nullable: true }
        description: { type: string, nullable: true }

    FoodProduct:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        kcal: { type: number }
        protein: { type: number }
        fat: { type: number }
        carbs: { type: number }

    CreateFoodProductRequest:
      type: object
      required: [name, kcal, protein, fat, carbs]
      properties:
        name: { type: string }
        kcal: { type: number, minimum: 0 }
        protein: { type: number, minimum: 0 }
        fat: { type: number, minimum: 0 }
        carbs: { type: number, minimum: 0 }

    ClientTrainerLink:
      type: object
      properties:
        id: { type: string, format: uuid }
        trainerId: { type: string, format: uuid }
        trainerName: { type: string }
        gymId: { type: string, format: uuid }
        gymName: { type: string }
        isActive: { type: boolean }
        assignedAt: { type: string, format: date-time }

    Goal:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        description: { type: string, nullable: true }
        isActive: { type: boolean }
        sortOrder: { type: integer }

    GoalRef:
      type: object
      nullable: true
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        description: { type: string, nullable: true }

    Client:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        phone: { type: string }
        name: { type: string }
        gender: { type: string, enum: [MALE, FEMALE, OTHER], nullable: true }
        height: { type: number, nullable: true, description: "см" }
        birthdate: { type: string, format: date, nullable: true }
        age: { type: integer, nullable: true, description: "вычисляется из birthdate" }
        startWeight: { type: number, nullable: true, description: "кг, неизменный" }
        startFatMass: { type: number, nullable: true, description: "%" }
        currentWeight: { type: number, nullable: true, description: "последний замер, кг" }
        currentFatMass: { type: number, nullable: true, description: "последний замер, %" }
        goal: { $ref: '#/components/schemas/GoalRef' }
        goalText: { type: string, nullable: true, description: "legacy-текст цели" }
        notes: { type: string, nullable: true }
        active_trainers:
          type: array
          items: { $ref: '#/components/schemas/ClientTrainerLink' }

    CreateClientRequest:
      type: object
      required: [phone, name]
      properties:
        phone: { type: string }
        name: { type: string }
        gender: { type: string, enum: [MALE, FEMALE, OTHER], nullable: true }
        height: { type: number, nullable: true, minimum: 0 }
        birthdate: { type: string, format: date, nullable: true }
        startWeight: { type: number, nullable: true, minimum: 0 }
        startFatMass: { type: number, nullable: true, minimum: 0, maximum: 100 }
        goalId: { type: string, format: uuid, nullable: true, description: "ID активной цели из справочника" }
        goal: { type: string, nullable: true, deprecated: true, description: "legacy-текст; использовать goalId" }
        notes: { type: string, nullable: true }

    CreateClientResponse:
      allOf:
        - $ref: '#/components/schemas/Client'
        - type: object
          properties:
            initial_password: { type: string }

    CreateTrainerRequest:
      type: object
      required: [phone, name]
      properties:
        phone: { type: string }
        name: { type: string }

    Trainer:
      type: object
      properties:
        id: { type: string, format: uuid }
        userId: { type: string, format: uuid }
        phone: { type: string }
        name: { type: string }

    CreateTrainerResponse:
      allOf:
        - $ref: '#/components/schemas/Trainer'
        - type: object
          properties:
            initial_password: { type: string }

    LinkTrainerRequest:
      type: object
      required: [trainer_id, gym_id]
      properties:
        trainer_id: { type: string, format: uuid }
        gym_id: { type: string, format: uuid }

    LinkGymRequest:
      type: object
      required: [gym_id]
      properties:
        gym_id: { type: string, format: uuid }

    WeightMeasurement:
      type: object
      properties:
        id: { type: string, format: uuid }
        clientId: { type: string, format: uuid }
        measuredBy: { type: string, format: uuid }
        measuredAt: { type: string, format: date-time }
        weight: { type: number, description: "кг" }
        fatMass: { type: number, nullable: true, description: "%" }
        comment: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }

    CreateWeightMeasurementRequest:
      type: object
      required: [weight, measuredAt]
      properties:
        weight: { type: number, minimum: 0 }
        fatMass: { type: number, nullable: true, minimum: 0, maximum: 100 }
        measuredAt: { type: string, format: date-time }
        comment: { type: string, nullable: true }

    WeightDynamicsPoint:
      type: object
      properties:
        measuredAt: { type: string, format: date-time }
        weight: { type: number }
        fatMass: { type: number, nullable: true }

    ExerciseProgressPoint:
      type: object
      properties:
        date: { type: string, format: date }
        plannedWeight: { type: number, nullable: true }
        actualWeight: { type: number, description: "если факт не введён — равен plannedWeight" }
        plannedReps: { type: integer }
        actualReps: { type: integer, description: "если факт не введён — равен plannedReps" }
        done: { type: boolean }
        isActualFallback: { type: boolean, description: "true = факт не введён, взят из плана" }

    ExerciseProgressResponse:
      type: object
      properties:
        exercise: { $ref: '#/components/schemas/Exercise' }
        points:
          type: array
          items: { $ref: '#/components/schemas/ExerciseProgressPoint' }

    ExerciseSummaryItem:
      type: object
      properties:
        exerciseId: { type: string, format: uuid }
        exerciseName: { type: string }
        firstWeight: { type: number, nullable: true }
        lastWeight: { type: number, nullable: true }
        recordsCount: { type: integer }

    AttendanceDynamicsPoint:
      type: object
      properties:
        period: { type: string, description: "YYYY-MM-DD (day/week) или YYYY-MM (month)" }
        visits: { type: integer }
        uniqueClients: { type: integer }

    AttendanceClientItem:
      type: object
      properties:
        clientId: { type: string, format: uuid }
        clientName: { type: string }
        visits: { type: integer }
        lastVisitDate: { type: string, format: date }

    AttendanceResponse:
      type: object
      properties:
        totalVisits: { type: integer, description: "визит = Workout.status DONE" }
        uniqueClients: { type: integer }
        dynamics:
          type: array
          items: { $ref: '#/components/schemas/AttendanceDynamicsPoint' }
        byClient:
          type: array
          items: { $ref: '#/components/schemas/AttendanceClientItem' }

    EquipmentUsageTypeItem:
      type: object
      properties:
        type: { $ref: '#/components/schemas/EquipmentType' }
        usageCount: { type: integer }
        uniqueClients: { type: integer }
        share: { type: number, description: "доля 0..1" }

    EquipmentUsageEquipmentItem:
      allOf:
        - $ref: '#/components/schemas/EquipmentUsageTypeItem'
        - type: object
          properties:
            equipmentId: { type: string, format: uuid }
            equipmentName: { type: string }

    EquipmentUsageClientItem:
      type: object
      properties:
        clientId: { type: string, format: uuid }
        clientName: { type: string }
        equipmentId: { type: string, format: uuid }
        equipmentName: { type: string }
        usageCount: { type: integer }
        lastUsedDate: { type: string, format: date }

    EquipmentUsageDynamicsPoint:
      type: object
      properties:
        period: { type: string }
        usageCount: { type: integer }

    EquipmentUsageItemRef:
      type: object
      nullable: true
      properties:
        equipmentId: { type: string, format: uuid }
        equipmentName: { type: string }
        usageCount: { type: integer }

    EquipmentUsageResponse:
      type: object
      properties:
        totalUsage: { type: integer }
        byType:
          type: array
          items: { $ref: '#/components/schemas/EquipmentUsageTypeItem' }
        byEquipment:
          type: array
          items: { $ref: '#/components/schemas/EquipmentUsageEquipmentItem' }
        byClient:
          type: array
          items: { $ref: '#/components/schemas/EquipmentUsageClientItem' }
        dynamics:
          type: array
          items: { $ref: '#/components/schemas/EquipmentUsageDynamicsPoint' }
        mostUsed: { $ref: '#/components/schemas/EquipmentUsageItemRef' }
        leastUsed: { $ref: '#/components/schemas/EquipmentUsageItemRef' }

    TrainerReportClientItem:
      type: object
      properties:
        clientId: { type: string, format: uuid }
        clientName: { type: string }
        visits: { type: integer }

    TrainerReportItem:
      type: object
      properties:
        trainerId: { type: string, format: uuid }
        trainerName: { type: string }
        visits: { type: integer, description: "Workout.status DONE у тренера" }
        uniqueClients: { type: integer }
        clients:
          type: array
          items: { $ref: '#/components/schemas/TrainerReportClientItem' }

    WorkoutTemplateItem:
      type: object
      properties:
        exerciseId: { type: string, format: uuid }
        equipmentId: { type: string, format: uuid, nullable: true }
        plannedWeight: { type: number, nullable: true }
        plannedSets: { type: integer }
        plannedReps: { type: integer }
        restSec: { type: integer, nullable: true }
        order: { type: integer }

    WorkoutTemplate:
      type: object
      properties:
        id: { type: string, format: uuid }
        trainerId: { type: string, format: uuid }
        name: { type: string }
        description: { type: string, nullable: true }
        items:
          type: array
          items: { $ref: '#/components/schemas/WorkoutTemplateItem' }

    WorkoutItemResult:
      type: object
      properties:
        done: { type: boolean }
        actualWeight: { type: number, nullable: true }
        actualReps: { type: integer, nullable: true }
        clientComment: { type: string, nullable: true }
        updatedAt: { type: string, format: date-time }

    WorkoutItem:
      type: object
      properties:
        id: { type: string, format: uuid }
        exercise: { $ref: '#/components/schemas/Exercise' }
        gymEquipment: { $ref: '#/components/schemas/GymEquipment' }
        plannedWeight: { type: number, nullable: true }
        plannedSets: { type: integer }
        plannedReps: { type: integer }
        order: { type: integer }
        result: { $ref: '#/components/schemas/WorkoutItemResult' }

    Workout:
      type: object
      properties:
        id: { type: string, format: uuid }
        clientId: { type: string, format: uuid }
        trainerId: { type: string, format: uuid }
        gymId: { type: string, format: uuid }
        date: { type: string, format: date }
        status: { $ref: '#/components/schemas/WorkoutStatus' }
        comment: { type: string, nullable: true }
        templateId: { type: string, format: uuid, nullable: true }
        items:
          type: array
          items: { $ref: '#/components/schemas/WorkoutItem' }

    CreateWorkoutRequest:
      type: object
      required: [client_id, gym_id, date, items]
      properties:
        client_id: { type: string, format: uuid }
        gym_id: { type: string, format: uuid }
        date: { type: string, format: date }
        template_id: { type: string, format: uuid, nullable: true }
        comment: { type: string, nullable: true }
        items:
          type: array
          items: { $ref: '#/components/schemas/WorkoutTemplateItem' }

    UpdateWorkoutItemResultRequest:
      type: object
      required: [done]
      properties:
        done: { type: boolean }
        actualWeight: { type: number, nullable: true }
        actualReps: { type: integer, nullable: true }
        clientComment: { type: string, nullable: true }

    NutritionRecommendation:
      type: object
      properties:
        id: { type: string, format: uuid }
        clientId: { type: string, format: uuid }
        trainerId: { type: string, format: uuid }
        type: { $ref: '#/components/schemas/NutritionType' }
        kcal: { type: number, nullable: true }
        protein: { type: number, nullable: true }
        fat: { type: number, nullable: true }
        carbs: { type: number, nullable: true }
        comment: { type: string, nullable: true }
        validFrom: { type: string, format: date, nullable: true }
        validTo: { type: string, format: date, nullable: true }

    CreateNutritionRequest:
      type: object
      required: [client_id, type]
      properties:
        client_id: { type: string, format: uuid }
        type: { $ref: '#/components/schemas/NutritionType' }
        kcal: { type: number, nullable: true }
        protein: { type: number, nullable: true }
        fat: { type: number, nullable: true }
        carbs: { type: number, nullable: true }
        comment: { type: string, nullable: true }
        validFrom: { type: string, format: date, nullable: true }
        validTo: { type: string, format: date, nullable: true }

    Chat:
      type: object
      properties:
        id: { type: string, format: uuid }
        type: { $ref: '#/components/schemas/ChatType' }
        peerId: { type: string, format: uuid }
        peerName: { type: string }
        lastMessage: { type: string, nullable: true }
        unreadCount: { type: integer }

    Message:
      type: object
      properties:
        id: { type: string, format: uuid }
        chatId: { type: string, format: uuid }
        senderId: { type: string, format: uuid }
        text: { type: string }
        attachmentUrl: { type: string, nullable: true }
        createdAt: { type: string, format: date-time }
        readAt: { type: string, format: date-time, nullable: true }

    SendMessageRequest:
      type: object
      required: [text]
      properties:
        text: { type: string, minLength: 1 }

    Notification:
      type: object
      properties:
        id: { type: string, format: uuid }
        gymId: { type: string, format: uuid, nullable: true }
        title: { type: string }
        body: { type: string }
        senderId: { type: string, format: uuid }
        createdAt: { type: string, format: date-time }
        readAt: { type: string, format: date-time, nullable: true }

    CreateNotificationRequest:
      type: object
      required: [title, body]
      properties:
        title: { type: string }
        body: { type: string }
        gym_id:
          type: string
          format: uuid
          nullable: true
          description: "если задан — broadcast клиентам с активной связью в этом зале"

paths:
  /health:
    get:
      security: []
      tags: [system]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: ok }

  /auth/login:
    post:
      security: []
      tags: [auth]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LoginRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenResponse' }
        '401':
          description: Unauthorized
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }

  /auth/refresh:
    post:
      security: []
      tags: [auth]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/RefreshRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/TokenResponse' }
        '401':
          description: Unauthorized

  /auth/me:
    get:
      tags: [auth]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/MeResponse' }

  /auth/timezone:
    patch:
      tags: [auth]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateTimezoneRequest' }
      responses:
        '204': { description: No Content }
        '400': { description: Invalid timezone }

  /auth/push-token:
    patch:
      tags: [auth]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdatePushTokenRequest' }
      responses:
        '204': { description: No Content }
        '400': { description: Invalid token }

  # ---------- ADMIN: gyms ----------
  /admin/gyms:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Gym' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateGymRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Gym' }

  /admin/gyms/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Gym' }
        '404': { description: Not Found }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateGymRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Gym' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }
        '409': { description: "Conflict: есть тренажёры" }

  # ---------- ADMIN: equipment ----------
  /admin/gyms/{gymId}/equipment:
    parameters:
      - { name: gymId, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/GymEquipment' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateEquipmentRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/GymEquipment' }
        '400': { description: "minWeight > maxWeight" }

  /admin/equipment/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateEquipmentRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/GymEquipment' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  # ---------- ADMIN: exercises ----------
  /admin/exercises:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Exercise' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateExerciseRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Exercise' }

  /admin/exercises/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateExerciseRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Exercise' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  # ---------- PUBLIC (JWT): exercises, gyms equipment ----------
  /exercises:
    get:
      tags: [shared]
      parameters:
        - { name: type, in: query, schema: { $ref: '#/components/schemas/EquipmentType' } }
        - { name: muscle_group, in: query, schema: { type: string } }
        - { name: q, in: query, schema: { type: string } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Exercise' }

  /gyms:
    get:
      tags: [shared]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Gym' }

  /gyms/{gymId}/equipment:
    parameters:
      - { name: gymId, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [shared]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/GymEquipment' }

  # ---------- ADMIN: food-products ----------
  /admin/food-products:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/FoodProduct' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateFoodProductRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FoodProduct' }

  /admin/food-products/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateFoodProductRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/FoodProduct' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  # ---------- ADMIN: clients + trainers ----------
  /admin/clients:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Client' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateClientRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CreateClientResponse' }
        '409': { description: Phone already exists }

  /admin/clients/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateClientRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Client' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  /admin/clients/{id}/trainers:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LinkTrainerRequest' }
      responses:
        '201': { description: Created }
        '409': { description: Link already exists }

  /admin/clients/{id}/trainers/{linkId}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      - { name: linkId, in: path, required: true, schema: { type: string, format: uuid } }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deactivated }

  /admin/trainers:
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Trainer' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateTrainerRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/CreateTrainerResponse' }
        '409': { description: Phone already exists }

  /admin/trainers/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateTrainerRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Trainer' }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deleted }

  # ---------- MULTI-GYM: admin links ----------
  /admin/trainers/{id}/gyms:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Gym' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LinkGymRequest' }
      responses:
        '201': { description: Created }
        '409': { description: Link already exists }

  /admin/trainers/{id}/gyms/{gymId}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      - { name: gymId, in: path, required: true, schema: { type: string, format: uuid } }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deactivated }

  /admin/clients/{id}/gyms:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [admin]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Gym' }
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/LinkGymRequest' }
      responses:
        '201': { description: Created }
        '409': { description: Link already exists }

  /admin/clients/{id}/gyms/{gymId}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      - { name: gymId, in: path, required: true, schema: { type: string, format: uuid } }
    delete:
      tags: [admin]
      responses:
        '204': { description: Deactivated }

  # ---------- ADMIN: upload ----------
  /admin/upload:
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              required: [file]
              properties:
                file:
                  type: string
                  format: binary
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties:
                  url: { type: string, example: "/uploads/uuid.png" }
        '400': { description: Invalid file }

  /admin/dashboard/stats:
    get:
      tags: [admin]
      summary: Агрегированная статистика дашборда
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  gyms: { type: integer }
                  activeGyms: { type: integer }
                  trainers: { type: integer }
                  clients: { type: integer }
                  equipment: { type: integer }
                  workouts: { type: integer }

  /admin/clients/{id}/weight-measurements:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [admin]
      summary: История замеров клиента (администратор)
      responses:
        '200':
          description: OK
    post:
      tags: [admin]
      summary: Добавить замер клиента (администратор)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateWeightMeasurementRequest' }
      responses:
        '201': { description: Created }

  # ---------- ADMIN: notifications ----------
  /admin/notifications:
    post:
      tags: [admin]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateNotificationRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Notification' }

  # ---------- WEIGHT MEASUREMENTS (trainer) ----------
  /client/{id}/weight-measurements:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [trainer]
      summary: История замеров клиента (только тренер при активной связи)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/WeightMeasurement' }
        '403': { description: Trainer not linked to client }
        '404': { description: Client not found }
    post:
      tags: [trainer]
      summary: Добавить замер (только тренер при активной связи)
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateWeightMeasurementRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/WeightMeasurement' }
        '400': { description: Validation error }
        '403': { description: Trainer not linked }
        '404': { description: Client not found }

  # ---------- REPORTS ----------
  /reports/weight-dynamics:
    get:
      tags: [client, trainer]
      summary: Динамика веса и жира
      parameters:
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid },
            description: "обязателен для trainer и admin; клиент игнорирует" }
        - { name: from, in: query, required: false, schema: { type: string, format: date } }
        - { name: to, in: query, required: false, schema: { type: string, format: date } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/WeightDynamicsPoint' }
        '403': { description: Trainer not linked }

  /reports/exercise-progress:
    get:
      tags: [client, trainer]
      summary: Прогресс по упражнению (план vs факт, с fallback)
      parameters:
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: exercise_id, in: query, required: true, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ExerciseProgressResponse' }
        '400': { description: exercise_id required }
        '403': { description: Trainer not linked }
        '404': { description: Exercise not found }

  /reports/exercises-summary:
    get:
      tags: [client, trainer]
      summary: Список упражнений, по которым есть история
      parameters:
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/ExerciseSummaryItem' }

  # ---------- GOALS ----------
  /admin/goals:
    get:
      tags: [admin]
      summary: Все цели (включая скрытые)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Goal' }
    post:
      tags: [admin]
      summary: Создать цель
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/Goal' }
      responses:
        '201': { description: Created }
        '409': { description: Goal name already exists }

  /admin/goals/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      summary: Обновить цель
      responses:
        '200': { description: OK }
        '404': { description: Goal not found }
        '409': { description: Goal name already exists }
    delete:
      tags: [admin]
      summary: Удалить цель
      responses:
        '204': { description: Deleted }
        '404': { description: Goal not found }
        '409': { description: Goal is used by clients }

  /goals:
    get:
      tags: [client, reception, trainer, admin]
      summary: Активные цели (справочник)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Goal' }

  /client/goal:
    get:
      tags: [client]
      summary: Текущая цель клиента
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/GoalRef' }
    put:
      tags: [client]
      summary: Выбрать цель
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [goalId]
              properties:
                goalId: { type: string, format: uuid }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/GoalRef' }
        '404': { description: Active goal not found }

  # ---------- REPORTS: attendance / equipment / trainers ----------
  /reports/attendance:
    get:
      tags: [admin, reception, trainer]
      summary: Отчёт по посещаемости (визит = Workout.status DONE)
      parameters:
        - { name: from, in: query, required: false, schema: { type: string, format: date } }
        - { name: to, in: query, required: false, schema: { type: string, format: date } }
        - { name: gym_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: trainer_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: group_by, in: query, required: false, schema: { type: string, enum: [day, week, month], default: day } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/AttendanceResponse' }
        '403': { description: "RECEPTION: чужой зал; TRAINER: чужой клиент/тренер/зал" }

  /reports/equipment-usage:
    get:
      tags: [admin, reception, trainer]
      summary: Отчёт по использованию тренажёров
      description: Учитываются только завершённые тренировки и позиции с equipmentId.
      parameters:
        - { name: from, in: query, required: false, schema: { type: string, format: date } }
        - { name: to, in: query, required: false, schema: { type: string, format: date } }
        - { name: gym_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: trainer_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: group_by, in: query, required: false, schema: { type: string, enum: [type, equipment, client], default: equipment } }
        - { name: period, in: query, required: false, schema: { type: string, enum: [day, week, month], default: day } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/EquipmentUsageResponse' }
        '403': { description: "RECEPTION: чужой зал; TRAINER: чужой клиент/тренер/зал" }

  /reports/trainers:
    get:
      tags: [admin, reception, trainer]
      summary: Отчёт по тренерам
      parameters:
        - { name: from, in: query, required: false, schema: { type: string, format: date } }
        - { name: to, in: query, required: false, schema: { type: string, format: date } }
        - { name: gym_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: trainer_id, in: query, required: false, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/TrainerReportItem' }
        '403': { description: "RECEPTION: чужой зал; TRAINER: чужой тренер/зал" }

  # ---------- TRAINER: workouts + nutrition ----------
  /trainer/clients:
    get:
      tags: [trainer]
      summary: Мои клиенты (активная связь)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Client' }

  # ---------- MULTI-GYM: trainer / client ----------
  /trainer/gyms:
    get:
      tags: [trainer]
      summary: Залы, где тренер активен
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Gym' }

  /client/gyms:
    get:
      tags: [client]
      summary: Залы, где клиент активен
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Gym' }

  /client/gyms/{gymId}/trainers:
    parameters:
      - { name: gymId, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [client]
      summary: Тренеры зала
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Trainer' }

  /client/gyms/{gymId}/trainers/{trainerId}/link:
    parameters:
      - { name: gymId, in: path, required: true, schema: { type: string, format: uuid } }
      - { name: trainerId, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [client]
      summary: Клиент сам выбрал тренера (assignedBy=CLIENT)
      responses:
        '201': { description: Created }
        '409': { description: Link already exists }

  /client/trainers:
    get:
      tags: [client]
      summary: Мои связи с тренерами
      responses:
        '200':
          description: OK

  /client/trainers/{linkId}:
    parameters:
      - { name: linkId, in: path, required: true, schema: { type: string, format: uuid } }
    delete:
      tags: [client]
      summary: Отвязать тренера
      responses:
        '204': { description: Deactivated }

  /trainer/templates:
    get:
      tags: [trainer]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/WorkoutTemplate' }
    post:
      tags: [trainer]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/WorkoutTemplate' }
      responses:
        '201': { description: Created }

  /trainer/workouts:
    get:
      tags: [trainer]
      parameters:
        - { name: client_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: gym_id, in: query, required: false, schema: { type: string, format: uuid } }
        - { name: from, in: query, required: false, schema: { type: string, format: date } }
        - { name: to, in: query, required: false, schema: { type: string, format: date } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Workout' }
    post:
      tags: [trainer]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateWorkoutRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }

  /trainer/workouts/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [trainer]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }
    put:
      tags: [trainer]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateWorkoutRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }
        '409': { description: Тренировка завершена (DONE/SKIPPED), изменение состава и плана запрещено }

  /trainer/workouts/{id}/start:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [trainer]
      summary: Начать тренировку клиента (PLANNED → IN_PROGRESS)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }
        '403': { description: Тренировка принадлежит другому тренеру или нет активной связи с клиентом }
        '404': { description: Workout not found }
        '409': { description: Тренировка уже начата или завершена }

  /trainer/workouts/{id}/finish:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [trainer]
      summary: Завершить тренировку клиента (IN_PROGRESS → DONE)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }
        '403': { description: Тренировка принадлежит другому тренеру или нет активной связи с клиентом }
        '404': { description: Workout not found }
        '409': { description: Тренировка ещё не начата или уже завершена }

  /trainer/workout-items/{id}/result:
    put:
      tags: [trainer]
      summary: Записать результат упражнения клиента
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateWorkoutItemResultRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/WorkoutItemResult' }
        '403': { description: Упражнение принадлежит тренировке другого тренера }
        '404': { description: Workout item not found }
        '409': { description: Тренировка не начата или уже завершена (результаты неизменяемы) }

  /trainer/nutrition:
    get:
      tags: [trainer]
      parameters:
        - { name: client_id, in: query, required: true, schema: { type: string, format: uuid } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/NutritionRecommendation' }
        '403':
          description: Trainer не привязан к клиенту
    post:
      tags: [trainer]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateNutritionRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/NutritionRecommendation' }

  # ---------- CLIENT ----------
  /client/workouts:
    get:
      tags: [client]
      parameters:
        - { name: from, in: query, required: true, schema: { type: string, format: date } }
        - { name: to, in: query, required: true, schema: { type: string, format: date } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Workout' }

  /client/workouts/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [client]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }
        '403': { description: Workout принадлежит другому клиенту }
        '404': { description: Workout not found }

  /client/workouts/{id}/start:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [client]
      summary: Начать тренировку (PLANNED → IN_PROGRESS)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }
        '403': { description: Workout принадлежит другому клиенту }
        '404': { description: Workout not found }
        '409': { description: Тренировка уже начата или завершена }

  /client/workouts/{id}/finish:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [client]
      summary: Завершить тренировку (IN_PROGRESS → DONE)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Workout' }
        '403': { description: Workout принадлежит другому клиенту }
        '404': { description: Workout not found }
        '409': { description: Тренировка ещё не начата или уже завершена }

  /client/workout-items/{id}/result:
    put:
      tags: [client]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/UpdateWorkoutItemResultRequest' }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema: { $ref: '#/components/schemas/WorkoutItemResult' }
        '403': { description: Workout item принадлежит другому клиенту }
        '404': { description: Workout item not found }
        '409': { description: Тренировка не начата или уже завершена (результаты неизменяемы) }

  /client/nutrition:
    get:
      tags: [client]
      parameters:
        - { name: date, in: query, required: false, schema: { type: string, format: date } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/NutritionRecommendation' }

  # ---------- CHATS ----------
  /chats:
    get:
      tags: [shared]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Chat' }

  /chats/{id}/messages:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [shared]
      parameters:
        - { name: before, in: query, required: false, schema: { type: string, format: date-time } }
        - { name: limit, in: query, required: false, schema: { type: integer, default: 50 } }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Message' }
    post:
      tags: [shared]
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/SendMessageRequest' }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Message' }

  /chats/{id}/read:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [shared]
      summary: Отметить сообщения чата прочитанными
      responses:
        '204': { description: Marked as read }

  # ---------- RECEPTION (admin) ----------
  /admin/receptions:
    get:
      tags: [admin]
      summary: Список ресепшенов
      responses:
        '200': { description: OK }
    post:
      tags: [admin]
      summary: Создать ресепшен
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [phone, name, gym_id]
              properties:
                phone: { type: string, maxLength: 20 }
                name: { type: string, maxLength: 100 }
                gym_id: { type: string, format: uuid }
                password: { type: string, minLength: 8, maxLength: 72 }
      responses:
        '201': { description: Created (initial_password) }

  /admin/receptions/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [admin]
      summary: Обновить ресепшен
      responses:
        '200': { description: OK }
    delete:
      tags: [admin]
      summary: Удалить ресепшен вместе с пользователем
      responses:
        '204': { description: Deleted }

  # ---------- RECEPTION (свой зал) ----------
  /reception/gyms:
    get:
      tags: [reception]
      summary: Мой зал
      responses:
        '200': { description: OK }

  /reception/clients:
    get:
      tags: [reception]
      summary: Клиенты моего зала
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Client' }
    post:
      tags: [reception]
      summary: Создать клиента в своём зале
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateClientRequest' }
      responses:
        '201': { description: Created (initial_password) }
        '409': { description: Phone already exists }

  /reception/clients/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [reception]
      summary: Обновить клиента своего зала
      responses:
        '200': { description: OK }
        '403': { description: Client is not active in your gym }

  /reception/clients/{id}/photo:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [reception]
      summary: Задать фото клиента
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [photoUrl]
              properties:
                photoUrl: { type: string, maxLength: 500 }
      responses:
        '201': { description: OK }

  /reception/clients/{id}/trainers:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    get:
      tags: [reception]
      summary: Тренеры клиента в моём зале
      responses:
        '200': { description: OK }
    post:
      tags: [reception]
      summary: Назначить тренера клиенту (assignedBy=RECEPTION)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [trainer_id]
              properties:
                trainer_id: { type: string, format: uuid }
      responses:
        '201': { description: Created }
        '409': { description: Trainer is already linked }

  /reception/clients/{id}/trainers/{linkId}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      - { name: linkId, in: path, required: true, schema: { type: string, format: uuid } }
    delete:
      tags: [reception]
      summary: Отвязать тренера от клиента
      responses:
        '204': { description: Deactivated }

  /reception/trainers:
    get:
      tags: [reception]
      summary: Тренеры моего зала
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Trainer' }
    post:
      tags: [reception]
      summary: Создать тренера в своём зале
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/CreateTrainerRequest' }
      responses:
        '201': { description: Created (initial_password) }
        '409': { description: Phone already exists }

  /reception/trainers/{id}:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    put:
      tags: [reception]
      summary: Обновить тренера своего зала
      responses:
        '200': { description: OK }
        '403': { description: Trainer is not active in your gym }

  /reception/trainers/{id}/photo:
    parameters:
      - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
    post:
      tags: [reception]
      summary: Задать фото тренера
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [photoUrl]
              properties:
                photoUrl: { type: string, maxLength: 500 }
      responses:
        '201': { description: OK }

  # ---------- NOTIFICATIONS (получатель) ----------
  /notifications:
    get:
      tags: [shared]
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Notification' }

  /notifications/{id}/read:
    post:
      tags: [shared]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string, format: uuid } }
      responses:
        '204': { description: Marked as read }

  # ---------- ADMIN: demo data ----------
  /admin/demo/status:
    get:
      tags: [admin]
      summary: Статус демо-данных
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                required: [loaded, gyms, trainers, clients, workouts]
                properties:
                  loaded: { type: boolean }
                  gyms: { type: integer, example: 3 }
                  trainers: { type: integer, example: 6 }
                  clients: { type: integer, example: 20 }
                  workouts: { type: integer, example: 780 }

  /admin/demo/load:
    post:
      tags: [admin]
      summary: Загрузить демо-данные (3 зала, 6 тренеров, 20 клиентов, 3 месяца тренировок)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                required: [loaded, gyms, trainers, clients, workouts, equipment, exercises, templates, measurements, nutrition]
                properties:
                  loaded: { type: boolean, example: true }
                  gyms: { type: integer, example: 3 }
                  trainers: { type: integer, example: 6 }
                  clients: { type: integer, example: 20 }
                  workouts: { type: integer, example: 780 }
                  equipment: { type: integer, example: 31 }
                  exercises: { type: integer, example: 24 }
                  templates: { type: integer, example: 12 }
                  measurements: { type: integer, example: 260 }
                  nutrition: { type: integer, example: 40 }
        '409': { description: Демо-данные уже загружены }

  /admin/demo:
    delete:
      tags: [admin]
      summary: Очистить демо-данные (реальные данные не затрагиваются)
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                required: [cleared, gyms, trainers, clients, workouts]
                properties:
                  cleared: { type: boolean, example: true }
                  gyms: { type: integer, example: 3 }
                  trainers: { type: integer, example: 6 }
                  clients: { type: integer, example: 20 }
                  workouts: { type: integer, example: 780 }
```
