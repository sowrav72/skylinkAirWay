from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from database import get_db
from models import (
    User, PaymentMethod, BookingAddon, LoyaltyPoint, LoyaltyTier,
    UserBadge, SupportTicket, SupportMessage, TravelAnalytics,
    UserNotification, UserPreference, Booking
)
from schemas import (
    UserProfileUpdate, UserProfileOut, PaymentMethodCreate, PaymentMethodOut,
    BookingAddonCreate, BookingAddonOut, SeatSelectionRequest, SeatSelectionOut,
    LoyaltyPointOut, LoyaltyTierOut, UserBadgeOut, SupportTicketCreate,
    SupportTicketOut, SupportMessageCreate, SupportMessageOut, TravelAnalyticsOut,
    UserNotificationOut, UserPreferenceUpdate, UserPreferenceOut, NotificationCreate
)
from auth import get_current_user

router = APIRouter(prefix="/passenger", tags=["passenger"])


# ── PROFILE MANAGEMENT ───────────────────────────────────────────────────────────

@router.get("/profile", response_model=UserProfileOut)
def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile information"""
    return current_user


@router.put("/profile", response_model=UserProfileOut)
def update_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile information"""
    update_data = profile_data.model_dump(exclude_unset=True)

    # Handle date_of_birth conversion
    if 'date_of_birth' in update_data and update_data['date_of_birth']:
        try:
            update_data['date_of_birth'] = datetime.strptime(update_data['date_of_birth'], '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )

    for key, value in update_data.items():
        setattr(current_user, key, value)

    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    return current_user


# ── PAYMENT METHODS ─────────────────────────────────────────────────────────────

@router.get("/payment-methods", response_model=List[PaymentMethodOut])
def get_payment_methods(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's saved payment methods"""
    return db.query(PaymentMethod).filter(PaymentMethod.user_id == current_user.id).all()


@router.post("/payment-methods", response_model=PaymentMethodOut, status_code=status.HTTP_201_CREATED)
def add_payment_method(
    payment_data: PaymentMethodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new payment method"""
    # If setting as default, unset other defaults
    if payment_data.is_default:
        db.query(PaymentMethod).filter(
            PaymentMethod.user_id == current_user.id
        ).update({"is_default": False})

    payment = PaymentMethod(
        user_id=current_user.id,
        **payment_data.model_dump()
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


@router.delete("/payment-methods/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_method(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a payment method"""
    payment = db.query(PaymentMethod).filter(
        PaymentMethod.id == payment_id,
        PaymentMethod.user_id == current_user.id
    ).first()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method not found"
        )

    db.delete(payment)
    db.commit()


# ── BOOKING ADD-ONS ─────────────────────────────────────────────────────────────

@router.post("/bookings/{booking_ref}/addons", response_model=BookingAddonOut, status_code=status.HTTP_201_CREATED)
def add_booking_addon(
    booking_ref: str,
    addon_data: BookingAddonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an add-on to a booking"""
    # Verify booking ownership
    booking = db.query(Booking).filter(
        Booking.booking_ref == booking_ref,
        Booking.user_id == current_user.id
    ).first()

    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )

    if booking.status not in ['pending', 'confirmed']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add add-ons to this booking"
        )

    addon = BookingAddon(
        booking_ref=booking_ref,
        user_id=current_user.id,
        **addon_data.model_dump()
    )

    db.add(addon)
    db.commit()
    db.refresh(addon)

    return addon


# ── LOYALTY PROGRAM ─────────────────────────────────────────────────────────────

@router.get("/loyalty/points", response_model=List[LoyaltyPointOut])
def get_loyalty_points(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's loyalty points history"""
    return db.query(LoyaltyPoint).filter(
        LoyaltyPoint.user_id == current_user.id
    ).order_by(desc(LoyaltyPoint.created_at)).all()


@router.get("/loyalty/tier", response_model=LoyaltyTierOut)
def get_loyalty_tier(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's current loyalty tier"""
    tier = db.query(LoyaltyTier).filter(
        LoyaltyTier.user_id == current_user.id
    ).order_by(desc(LoyaltyTier.assigned_at)).first()

    if not tier:
        # Create default tier
        tier = LoyaltyTier(
            user_id=current_user.id,
            tier_name="Standard",
            tier_level=1,
            points_threshold=0,
            benefits=["Priority boarding", "Extra baggage allowance"]
        )
        db.add(tier)
        db.commit()
        db.refresh(tier)

    return tier


@router.get("/loyalty/badges", response_model=List[UserBadgeOut])
def get_user_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's earned badges"""
    return db.query(UserBadge).filter(
        UserBadge.user_id == current_user.id
    ).order_by(desc(UserBadge.earned_at)).all()


# ── SUPPORT SYSTEM ──────────────────────────────────────────────────────────────

@router.post("/support/tickets", response_model=SupportTicketOut, status_code=status.HTTP_201_CREATED)
def create_support_ticket(
    ticket_data: SupportTicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new support ticket"""
    # Generate ticket number
    ticket_count = db.query(func.count(SupportTicket.id)).scalar()
    ticket_number = f"TICK-{str(ticket_count + 1).zfill(6)}"

    ticket = SupportTicket(
        user_id=current_user.id,
        ticket_number=ticket_number,
        **ticket_data.model_dump()
    )

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return ticket


@router.get("/support/tickets", response_model=List[SupportTicketOut])
def get_support_tickets(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's support tickets"""
    query = db.query(SupportTicket).filter(SupportTicket.user_id == current_user.id)

    if status_filter:
        query = query.filter(SupportTicket.status == status_filter)

    return query.order_by(desc(SupportTicket.created_at)).all()


@router.get("/support/tickets/{ticket_id}", response_model=SupportTicketOut)
def get_support_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific support ticket"""
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.user_id == current_user.id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    return ticket


@router.get("/support/tickets/{ticket_id}/messages", response_model=List[SupportMessageOut])
def get_ticket_messages(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get messages for a support ticket"""
    # Verify ticket ownership
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.user_id == current_user.id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    return db.query(SupportMessage).filter(
        SupportMessage.ticket_id == ticket_id,
        SupportMessage.is_internal == False  # Only show non-internal messages to user
    ).order_by(SupportMessage.created_at).all()


@router.post("/support/tickets/{ticket_id}/messages", response_model=SupportMessageOut, status_code=status.HTTP_201_CREATED)
def add_ticket_message(
    ticket_id: int,
    message_data: SupportMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a message to a support ticket"""
    # Verify ticket ownership
    ticket = db.query(SupportTicket).filter(
        SupportTicket.id == ticket_id,
        SupportTicket.user_id == current_user.id
    ).first()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    if ticket.status == 'closed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add messages to closed tickets"
        )

    message = SupportMessage(
        ticket_id=ticket_id,
        sender_role='user',
        sender_id=current_user.id,
        **message_data.model_dump()
    )

    db.add(message)

    # Update ticket response count and timestamp
    ticket.response_count += 1
    ticket.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(message)

    return message


# ── TRAVEL ANALYTICS ────────────────────────────────────────────────────────────

@router.get("/analytics", response_model=List[TravelAnalyticsOut])
def get_travel_analytics(
    period: str = Query("all_time", description="Time period for analytics"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's travel analytics"""
    analytics = db.query(TravelAnalytics).filter(
        TravelAnalytics.user_id == current_user.id,
        TravelAnalytics.period == period
    ).all()

    # If no analytics exist, create default entries
    if not analytics:
        # Calculate from actual bookings
        bookings = db.query(Booking).filter(
            Booking.user_id == current_user.id,
            Booking.status.in_(['confirmed', 'completed'])
        ).all()

        total_spent = sum(float(b.total_price) for b in bookings)
        total_bookings = len(bookings)

        # Create analytics entries
        analytics_data = [
            TravelAnalytics(
                user_id=current_user.id,
                metric_type="total_spent",
                metric_value=total_spent,
                period=period
            ),
            TravelAnalytics(
                user_id=current_user.id,
                metric_type="total_bookings",
                metric_value=total_bookings,
                period=period
            ),
            TravelAnalytics(
                user_id=current_user.id,
                metric_type="total_miles",
                metric_value=0,  # Would need to calculate from flight distances
                period=period
            )
        ]

        for analytic in analytics_data:
            db.add(analytic)
        db.commit()

        analytics = analytics_data

    return analytics


# ── NOTIFICATIONS ───────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[UserNotificationOut])
def get_notifications(
    unread_only: bool = Query(False, description="Show only unread notifications"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notifications"""
    query = db.query(UserNotification).filter(UserNotification.user_id == current_user.id)

    if unread_only:
        query = query.filter(UserNotification.is_read == False)

    return query.order_by(desc(UserNotification.created_at)).limit(limit).all()


@router.put("/notifications/{notification_id}/read", response_model=UserNotificationOut)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read"""
    notification = db.query(UserNotification).filter(
        UserNotification.id == notification_id,
        UserNotification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    notification.is_read = True
    notification.read_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(notification)

    return notification


@router.put("/notifications/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read"""
    updated_count = db.query(UserNotification).filter(
        UserNotification.user_id == current_user.id,
        UserNotification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.now(timezone.utc)
    })

    db.commit()

    return {"message": f"Marked {updated_count} notifications as read"}


# ── USER PREFERENCES ────────────────────────────────────────────────────────────

@router.get("/preferences", response_model=List[UserPreferenceOut])
def get_user_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's preferences"""
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).all()

    # If no preferences exist, create defaults
    if not preferences:
        default_prefs = [
            UserPreference(
                user_id=current_user.id,
                preference_key="theme",
                preference_value="light"
            ),
            UserPreference(
                user_id=current_user.id,
                preference_key="notifications",
                preference_value={"email": True, "sms": False, "push": True}
            ),
            UserPreference(
                user_id=current_user.id,
                preference_key="accessibility",
                preference_value={"high_contrast": False, "screen_reader": False}
            ),
            UserPreference(
                user_id=current_user.id,
                preference_key="default_cabin",
                preference_value="Economy"
            )
        ]

        for pref in default_prefs:
            db.add(pref)
        db.commit()

        preferences = default_prefs

    return preferences


@router.put("/preferences/{preference_key}", response_model=UserPreferenceOut)
def update_user_preference(
    preference_key: str,
    preference_data: UserPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a user preference"""
    preference = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id,
        UserPreference.preference_key == preference_key
    ).first()

    if preference:
        preference.preference_value = preference_data.preference_value
        preference.updated_at = datetime.now(timezone.utc)
    else:
        preference = UserPreference(
            user_id=current_user.id,
            preference_key=preference_key,
            preference_value=preference_data.preference_value
        )
        db.add(preference)

    db.commit()
    db.refresh(preference)

    return preference